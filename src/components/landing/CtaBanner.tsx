import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Reveal from '@/components/landing/Reveal';
import Section from '@/components/landing/Section';

/**
 * Closing call-to-action banner.
 *
 * Colour comes from the theme (`Section`'s `brand` tone is built from
 * `primary` and `secondary`), never a hardcoded hex, so it follows any change
 * to the palette.
 *
 * ## One primary action, not two equal ones
 *
 * Both buttons used to be outlined, which made the banner ask a question
 * instead of making a request: registering and writing to us were offered with
 * identical weight, so neither was the obvious next thing. The solid white
 * button is the ask; the ghost button is the escape hatch for somebody not
 * ready to take it.
 *
 * `flushBottom` cancels the layout's bottom padding, so the band reaches the
 * full width of the page and the only thing left between it and the footer is
 * the footer's own top margin — a deliberate breath, not a leftover gutter.
 */
export default function CtaBanner() {
  return (
    <Section tone="brand" flushBottom py={{ xs: 7, md: 9 }} sx={{ position: 'relative' }}>
      {/*
       * A soft highlight in the top-right corner. It stops the band reading as
       * one flat rectangle of blue without adding anything a reader has to
       * look at. `inset: 0` on an absolutely positioned child of the Section,
       * so it covers the bleed as well as the container.
       */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(60% 120% at 85% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%)',
        }}
      />

      <Reveal sx={{ position: 'relative' }}>
        <Stack spacing={3} sx={{ maxWidth: 720 }}>
          <Stack spacing={1.5}>
            <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 700 }}>
              Prvi korak je nalog. Ostalo ide tvojim tempom.
            </Typography>
            <Typography variant="h6" component="p" sx={{ fontWeight: 400, opacity: 0.88 }}>
              Registracija traje minutu i ne obavezuje ni na šta — kurseve upisuješ kada odlučiš.
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              href="/register"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: 'common.white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'common.white', filter: 'brightness(0.94)' },
              }}
            >
              Registruj se
            </Button>
            <Button
              href="/kontakt"
              variant="outlined"
              size="large"
              sx={{
                color: 'inherit',
                borderColor: 'rgba(255,255,255,0.55)',
                '&:hover': {
                  borderColor: 'common.white',
                  bgcolor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              Kontaktiraj nas
            </Button>
          </Stack>
        </Stack>
      </Reveal>
    </Section>
  );
}
