'use client';

import * as React from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ErrorState from '@/components/feedback/ErrorState';

/**
 * Renders a PDF page-by-page onto a canvas.
 *
 * ## Why canvas and not `<iframe>` / `<embed>`
 *
 * Both of those hand the file to the browser's built-in PDF plugin, which comes
 * with its own download and print buttons. The whole point of showing materials
 * in-app is that the student reads them as part of the page rather than opening
 * a file, so the viewer has to be one we draw ourselves.
 *
 * To be clear about what this does and does not achieve: the bytes are on the
 * machine either way — that is what rendering means. This removes the one-click
 * save affordance and keeps the reading experience inside the app. It is not a
 * security control, and nothing client-side could be. See the note in
 * `/api/module-files/[id]/content` for the other half of the reasoning.
 *
 * Deliberately **not** done: blocking right-click or keyboard shortcuts. It
 * stops nobody, and it breaks normal browser behaviour and accessibility for
 * everyone else.
 *
 * ## Fit-page by default, not fit-width
 *
 * Scaling a portrait A4 to the container's *width* makes it about 1.4x taller
 * than it is wide, inside a page that already scrolls — so reading one PDF page
 * meant scrolling the document, losing the toolbar, and never seeing a whole
 * page at once. The default now fits the **whole page** into a bounded
 * viewport, so a page is a page; zoom is there for anyone who wants it bigger.
 *
 * Fullscreen uses the native Fullscreen API on the wrapper rather than a
 * dialog. A dialog would remount this component and re-fetch the PDF; keeping
 * the same element means the canvas and the loaded document survive and only
 * the scale is recomputed.
 *
 * ## Loading pdf.js
 *
 * The library is imported dynamically inside an effect, for two reasons: it is
 * large, and it touches browser globals at module scope, so it must never be
 * pulled into a server render. The worker is resolved from the same package via
 * `new URL(..., import.meta.url)`, which the bundler rewrites to a real asset
 * URL — no file copied into `public/`, nothing to keep in sync on upgrade.
 */
export default function PdfViewer({ src, title }: { src: string; title?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Held in a ref, not state: it is a mutable handle, and putting it in state
  // would re-render on every page change for no visual reason.
  const docRef = React.useRef<{
    numPages: number;
    getPage: (n: number) => Promise<unknown>;
  } | null>(null);

  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const [pageCount, setPageCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [zoom, setZoom] = React.useState(1);
  const [fitWidth, setFitWidth] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  /*
   * The container's measured box. Kept in state rather than read during render
   * because entering fullscreen resizes it without any other prop changing —
   * without this the canvas would keep its old scale until the next page turn.
   */
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);

  // --- Load the document -----------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => void } | null = null;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const pdfjs = await import('pdfjs-dist');

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        // `withCredentials` so the session cookie reaches our proxy route —
        // without it the request is anonymous and comes back 401.
        const task = pdfjs.getDocument({ url: src, withCredentials: true });
        loadingTask = task;

        const doc = await task.promise;
        if (cancelled) return;

        docRef.current = doc as unknown as typeof docRef.current;
        setPageCount(doc.numPages);
        setPage(1);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      // Abort an in-flight fetch and free the worker when the material changes
      // or the viewer unmounts.
      loadingTask?.destroy();
      docRef.current = null;
    };
  }, [src]);

  // --- Render the current page ----------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    async function render() {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas || pageCount === 0) return;

      const pdfPage = (await doc.getPage(page)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: unknown) => { promise: Promise<void>; cancel: () => void };
      };
      if (cancelled) return;

      /*
       * Fit, then apply the user's zoom on top.
       *
       * Page fit takes the smaller of the two ratios so the whole sheet is
       * visible; width fit is the old behaviour, kept for anyone who would
       * rather scroll than squint. The padding allowance stops a fitted page
       * from touching the container edge and raising a scrollbar, which would
       * narrow the container and re-trigger the fit.
       */
      const availableWidth = (box.width || containerRef.current?.clientWidth || 800) - 16;
      const availableHeight = (box.height || 640) - 16;
      const base = pdfPage.getViewport({ scale: 1 });

      const widthRatio = availableWidth / base.width;
      const heightRatio = availableHeight / base.height;
      const fit = fitWidth ? widthRatio : Math.min(widthRatio, heightRatio);

      const viewport = pdfPage.getViewport({ scale: fit * zoom });

      // Draw at device resolution so text is not blurry on high-DPI screens,
      // while CSS keeps the element at layout size.
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = pdfPage.render({ canvasContext: context, viewport, canvas });
      renderTask = task;

      try {
        await task.promise;
      } catch {
        // A cancelled render is normal when paging quickly; nothing to report.
      }
    }

    void render();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [page, zoom, pageCount, fitWidth, box.width, box.height]);

  // --- Keep `box` in step with the container -------------------------------
  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Ignore sub-pixel jitter; re-rendering a PDF page is not cheap.
      setBox((current) =>
        Math.abs(current.width - width) < 2 && Math.abs(current.height - height) < 2
          ? current
          : { width, height },
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // --- Track fullscreen, including the user pressing Escape ----------------
  React.useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === wrapperRef.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current?.requestFullscreen();
    } catch {
      // Refused by the browser (permissions policy, an iframe without
      // `allowfullscreen`). The viewer still works inline, so this is not worth
      // interrupting the reader over.
    }
  }

  if (error) {
    return <ErrorState error={error} title="Materijal nije moguće prikazati" />;
  }

  return (
    <Stack
      ref={wrapperRef}
      sx={{
        // In fullscreen the wrapper *is* the screen, so it paints its own
        // background — otherwise the browser shows black behind the toolbar.
        ...(fullscreen ? { height: '100%', bgcolor: 'background.paper' } : null),
      }}
    >
      {loading ? <LinearProgress /> : null}

      <Box
        ref={containerRef}
        sx={{
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
          // Bounded, so a fitted page has a height to fit *into*. Without a
          // ceiling here "fit page" has no meaning and the tall-page problem
          // comes straight back.
          height: fullscreen ? '100%' : 'min(70vh, 760px)',
          minHeight: 320,
          overflow: 'auto',
        }}
      >
        <canvas ref={canvasRef} aria-label={title ?? 'PDF materijal'} />
      </Box>

      <Divider />

      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 2, py: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || pageCount === 0}
          aria-label="Prethodna stranica"
        >
          <ChevronLeftIcon />
        </IconButton>

        <Typography variant="body2" sx={{ minWidth: 96, textAlign: 'center' }}>
          {pageCount === 0 ? '—' : `${page} / ${pageCount}`}
        </Typography>

        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={page >= pageCount || pageCount === 0}
          aria-label="Sljedeća stranica"
        >
          <ChevronRightIcon />
        </IconButton>

        <Box sx={{ width: 16 }} />

        <IconButton
          size="small"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
          disabled={zoom <= 0.5}
          aria-label="Umanji"
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
          disabled={zoom >= 3}
          aria-label="Uvećaj"
        >
          <ZoomInIcon />
        </IconButton>

        <Box sx={{ width: 16 }} />

        <Tooltip title={fitWidth ? 'Prikaži cijelu stranicu' : 'Prilagodi širini'}>
          <IconButton
            size="small"
            onClick={() => {
              setFitWidth((v) => !v);
              // Switching fit mode with a zoom applied lands somewhere
              // arbitrary; resetting makes the button mean what it says.
              setZoom(1);
            }}
            aria-label={fitWidth ? 'Prikaži cijelu stranicu' : 'Prilagodi širini'}
          >
            <FitScreenOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={fullscreen ? 'Izađi iz punog ekrana' : 'Puni ekran'}>
          <IconButton
            size="small"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? 'Izađi iz punog ekrana' : 'Puni ekran'}
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
