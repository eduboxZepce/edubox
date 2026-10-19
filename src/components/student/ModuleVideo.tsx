'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  parseYouTubeUrl,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  type YouTubeVideo,
} from '@/lib/youtube';
import { loadYouTubeIframeApi, YT_STATE, type YTPlayer } from '@/lib/youtubeIframeApi';

/**
 * The module's video, embedded from YouTube behind our own controls.
 *
 * ## The src is rebuilt, never passed through
 *
 * The stored link is parsed and only the video id (and a start time) survive
 * into the iframe — see `youtubeEmbedUrl`. A stored URL is author input, and
 * putting it straight into `src` would embed whatever it pointed at.
 *
 * ## Nothing in the player leads to YouTube
 *
 * A transparent layer covers the whole iframe, so no click ever reaches
 * YouTube's title, logo or "watch on YouTube" links, and since the iframe never
 * receives a hover either, the chrome YouTube shows on hover never appears. A
 * click on the layer toggles playback; the bar underneath is ours, driving the
 * embed through the IFrame Player API. Before the first play and after the end
 * the layer becomes the video's thumbnail, which also hides YouTube's start
 * screen and end-of-video suggestions; while paused, a band across the top hides
 * the title bar YouTube shows on pause.
 *
 * Fullscreen is requested on the wrapper rather than the iframe, so the layer
 * and the bar come along.
 *
 * ## What this is not
 *
 * **Not protection.** The id is in the iframe src, so anyone who opens devtools
 * has the YouTube link. This stops a student *wandering off* to YouTube, nothing
 * more. **And it is against YouTube's API terms**, which forbid overlays in front
 * of the player — a deliberate choice by the project owner, accepting that
 * YouTube could restrict embedding on this site. A host that allows a custom
 * player (Bunny Stream, Mux, Vimeo paid) is the clean alternative.
 *
 * ## Phones may need one tap on YouTube's own button
 *
 * Mobile browsers can refuse to start a video from a script in another frame,
 * even inside a click. If the first play has not begun shortly after the click,
 * the layer stands aside and asks for a tap on the video itself, then returns as
 * soon as playback starts — the one moment YouTube's chrome is reachable.
 *
 * ## Old links
 *
 * Rows written before the YouTube rule (Vimeo links, typos) are still stored.
 * They fail to parse and get a notice instead of the player — never a crash,
 * and never a blank black rectangle that reads as "the video is broken".
 *
 * Access is not decided here. This only renders for a viewer who already
 * received `video_url`, and that field comes from
 * `GET /api/courses/:id/modules`, which runs `assertCourseAccess` first.
 */
export default function ModuleVideo({ url, title }: { url: string; title: string }) {
  const video = parseYouTubeUrl(url);

  if (!video) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Video za ovaj modul trenutno nije dostupan. Predavač ga treba zamijeniti ispravnim YouTube
        linkom.
      </Alert>
    );
  }

  // Keyed so switching modules starts a fresh player instead of carrying over
  // the previous video's time, duration and state.
  return <VideoPlayer key={`${video.id}:${video.start ?? 0}`} video={video} title={title} />;
}

/** How long the first play may take before we assume the browser refused it. */
const DIRECT_TAP_DELAY_MS = 2000;

/**
 * Vertical space the page keeps for things other than the picture: the sticky
 * app bar (64), our control bar (48) and some breathing room (32). The picture
 * is capped at what remains, so once scrolled to it the whole player — picture
 * and controls — fits on screen. Capping the *width* by `height × 16/9` keeps the
 * aspect ratio; the black wrapper letterboxes the sides on wide, short screens.
 */
const RESERVED_HEIGHT_PX = 64 + 48 + 32;
const MAX_PICTURE_WIDTH = `calc((100dvh - ${RESERVED_HEIGHT_PX}px) * 16 / 9)`;

const noopSubscribe = () => () => {};

function VideoPlayer({ video, title }: { video: YouTubeVideo; title: string }) {
  // The embed URL must name this page's origin, which the server cannot know.
  // Rendering the iframe only once this resolves avoids a hydration mismatch.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => null,
  );
  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<number>(YT_STATE.UNSTARTED);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(video.start ?? 0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [needsDirectTap, setNeedsDirectTap] = useState(false);
  const [failed, setFailed] = useState(false);

  const playing = state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING;
  const ended = state === YT_STATE.ENDED;

  // Attach the API to the iframe once it exists.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let player: YTPlayer | null = null;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(iframe, {
          events: {
            onReady: ({ target }) => {
              playerRef.current = target;
              setDuration(target.getDuration());
              setMuted(target.isMuted());
              setReady(true);
            },
            onStateChange: ({ data, target }) => {
              setState(data);
              if (data === YT_STATE.PLAYING) {
                setStarted(true);
                setNeedsDirectTap(false);
                // Live and some long videos only report a duration once playing.
                setDuration(target.getDuration());
              }
            },
            onError: () => setFailed(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
    };
  }, [origin]);

  // The API has no time-update event, so poll while the video moves.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (player) setCurrent(player.getCurrentTime());
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // The mobile fallback: if the first play has not begun by the deadline, the
  // browser refused a script-started play and the student must tap YouTube's.
  const firstPlayTimer = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(firstPlayTimer.current ?? undefined), []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (playing) {
      player.pauseVideo();
      return;
    }
    if (ended) player.seekTo(0, true);
    player.playVideo();

    if (!started) {
      window.clearTimeout(firstPlayTimer.current ?? undefined);
      firstPlayTimer.current = window.setTimeout(() => {
        const s = playerRef.current?.getPlayerState();
        if (s !== YT_STATE.PLAYING && s !== YT_STATE.BUFFERING) setNeedsDirectTap(true);
      }, DIRECT_TAP_DELAY_MS);
    }
  }, [playing, ended, started]);

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.unMute();
    else player.mute();
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapperRef.current?.requestFullscreen();
  };

  const commitSeek = (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setCurrent(seconds);
    setScrubbing(null);
  };

  if (failed) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Video trenutno nije moguće reproducirati. Pokušajte ponovo kasnije.
      </Alert>
    );
  }

  const showPoster = !needsDirectTap && (!started || ended);
  const shown = scrubbing ?? current;

  return (
    <Stack
      ref={wrapperRef}
      sx={{
        width: '100%',
        bgcolor: 'common.black',
        borderRadius: fullscreen ? 0 : 1,
        overflow: 'hidden',
        ...(fullscreen && { height: '100%' }),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          ...(fullscreen
            ? { flex: 1, minHeight: 0 }
            : { aspectRatio: '16 / 9', maxWidth: MAX_PICTURE_WIDTH, mx: 'auto' }),
        }}
      >
        {origin ? (
          <Box
            component="iframe"
            ref={iframeRef}
            src={youtubeEmbedUrl(video, origin)}
            title={`Video: ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            // Unreachable behind the layer, so keep it out of the tab order too.
            tabIndex={-1}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : null}

        {/* The layer that keeps clicks off YouTube's chrome. */}
        <Box
          aria-hidden
          onClick={ready ? togglePlay : undefined}
          sx={{
            position: 'absolute',
            inset: 0,
            cursor: ready ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: needsDirectTap ? 'none' : 'auto',
            ...(showPoster && {
              backgroundImage: `url(${youtubeThumbnailUrl(video)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }),
            // While paused YouTube draws its title bar along the top edge.
            ...(!showPoster &&
              !playing &&
              !needsDirectTap && {
                background:
                  'linear-gradient(to bottom, #000 0, #000 64px, rgba(0,0,0,0.35) 120px, rgba(0,0,0,0.35) 100%)',
              }),
          }}
        >
          {!playing && !needsDirectTap ? (
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ended ? (
                <ReplayIcon sx={{ fontSize: 40 }} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: 48 }} />
              )}
            </Box>
          ) : null}
        </Box>

        {needsDirectTap ? (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 8,
              textAlign: 'center',
              color: 'common.white',
              pointerEvents: 'none',
              textShadow: '0 1px 3px #000',
            }}
          >
            Dodirnite video za pokretanje
          </Typography>
        ) : null}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', px: 1, py: 0.5, color: 'common.white' }}
      >
        <IconButton
          onClick={togglePlay}
          disabled={!ready}
          aria-label={playing ? 'Pauziraj' : ended ? 'Pusti ponovo' : 'Pusti'}
          sx={{ color: 'inherit' }}
        >
          {playing ? <PauseIcon /> : ended ? <ReplayIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Slider
          size="small"
          aria-label="Pozicija u videu"
          value={shown}
          max={duration || 1}
          step={1}
          disabled={!ready || !duration}
          onChange={(_, value) => setScrubbing(value as number)}
          onChangeCommitted={(_, value) => commitSeek(value as number)}
          getAriaValueText={formatClock}
          sx={{ color: 'common.white', flex: 1, mx: 1 }}
        />

        <Typography
          variant="caption"
          sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatClock(shown)} / {formatClock(duration)}
        </Typography>

        <IconButton
          onClick={toggleMute}
          disabled={!ready}
          aria-label={muted ? 'Uključi zvuk' : 'Isključi zvuk'}
          sx={{ color: 'inherit' }}
        >
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>

        {canFullscreen ? (
          <IconButton
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Izađi iz punog ekrana' : 'Puni ekran'}
            sx={{ color: 'inherit' }}
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        ) : null}
      </Stack>
    </Stack>
  );
}

/** 75 → "1:15", 3725 → "1:02:05". */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
