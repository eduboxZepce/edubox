// components/landing/Hero.tsx
import Image from 'next/image';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Reveal from '@/components/landing/Reveal';
import { MARKETING_BLEED } from '@/components/layout/marketingGutter';
import { FEATURES } from '@/lib/features';

/**
 * Hero section for the landing page — the first thing a visitor sees.
 *
 * The illustration fills the entire hero edge to edge (both where the text sits
 * and beyond it) rather than living in its own grid column, and the copy sits
 * in its own solid panel layered on top, so it stays readable against the photo
 * underneath.
 *
 * ## Why it bleeds
 *
 * `(marketing)/layout.tsx` pads `<main>`, which left the hero as a floating
 * rectangle with a white margin on three sides — the shape of a mistake rather
 * than of a decision. It now cancels that padding on the sides *and* the top,
 * so it runs edge to edge and butts straight up against the app bar. It does
 * this directly instead of through `<Section>` because it is the one section
 * whose surface is a photograph rather than a colour.
 *
 * ## The reassurance row
 *
 * The three ticks under the buttons are the objections a stranger has at the
 * moment they are deciding whether to click: how long they have, what they are
 * committing to, and whether the certificate is worth anything. They restate
 * promises made further down the page, which is the point — nobody scrolls to
 * find out whether to scroll.
 *
 * Used once, at the top of `(marketing)/page.tsx`.
 */
const REASSURANCES = [
  'Trajan pristup materijalima',
  'Bez fiksnih rokova',
  'Certifikat s provjerom',
];

export default function Hero() {
  return (
    <Box
      sx={{
        position: 'relative',
        mx: MARKETING_BLEED,
        mt: MARKETING_BLEED,
        borderTop: 3,
        borderBottom: 1,
        borderColor: 'primary.main',
        borderBottomColor: 'divider',
        minHeight: { xs: 520, md: 600 },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Full-width background image, spanning the entire hero. */}
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <Image
          src="/hero-classroom.jpg"
          alt="Školska klupa s ruksakom, učenici razgovaraju u pozadini"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
      </Box>

      {/*
       * A scrim, left-heavy. The illustration is pale enough that the panel is
       * readable without it, but the panel's edge against a busy patch of the
       * drawing reads as a sticker; fading the photo out underneath the copy
       * lets the two sit on the same plane. Pointer-events are irrelevant here
       * (nothing behind it is interactive) but the layering is not — it must be
       * above the image and below the container.
       */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: {
            xs: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.42))',
            md: 'linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.55) 46%, rgba(255,255,255,0) 72%)',
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 9 } }}>
        <Reveal distance={18}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              p: { xs: 3, md: 5 },
              maxWidth: 660,
              boxShadow: 8,
            }}
          >
            <Stack spacing={3}>
              <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
                Online obuke · Certifikat · Povratna informacija predavača
              </Typography>

              <Typography
                variant="h1"
                sx={{ fontSize: { xs: 32, md: 50 }, lineHeight: 1.1, letterSpacing: '-0.025em' }}
              >
                Uči svojim tempom.{' '}
                <Box component="span" sx={{ color: 'primary.main' }}>
                  Napreduj
                </Box>{' '}
                uz stvarnu povratnu informaciju.
              </Typography>

              <Typography
                variant="h6"
                component="p"
                color="text.secondary"
                sx={{ fontWeight: 400, maxWidth: 520 }}
              >
                Registriraj se, odaberi obuku iz naše ponude i prolazi materijale kada tebi
                odgovara. Zadatke pregleda predavač, a po završetku dobivaš certifikat.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                <Button
                  href="/register"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  Registriraj se
                </Button>
                {FEATURES.catalog ? (
                  <Button
                    href="/courses"
                    variant="outlined"
                    size="large"
                    sx={{ borderColor: 'divider', color: 'text.primary' }}
                  >
                    Pregledaj obuke
                  </Button>
                ) : null}
              </Stack>

              <Stack
                direction="row"
                useFlexGap
                sx={{ flexWrap: 'wrap', columnGap: 2.5, rowGap: 1, pt: 0.5 }}
              >
                {REASSURANCES.map((item) => (
                  <Stack key={item} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <CheckRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
