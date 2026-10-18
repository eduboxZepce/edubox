import * as React from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Reveal from '@/components/landing/Reveal';
import Section from '@/components/landing/Section';

/**
 * "Kako funkcioniše" — the four steps from registration to certificate.
 *
 * ## Why the steps stayed a list and did not become cards
 *
 * They are a *sequence*, and four cards side by side say "pick one". The rows
 * keep the reading order that the numbering already implies. What they were
 * missing was weight: the step number was set in the same grey as the body
 * text, so the one element that carries the order was the quietest thing in the
 * row. It is now a filled badge, which is also what makes the column scannable
 * without reading a word of it.
 *
 * The section id is the target of the header's "Kako funkcioniše" link, so it
 * must stay `kako-funkcionise`.
 *
 * Dividers are inserted manually (`index > 0 && <Divider />`) rather than with
 * Stack's `divider` prop. `divider` clones itself between children via
 * `React.Children`, and fed a mapped array it threw "element type is invalid…
 * undefined" at render time. Wrapping each step in its own fragment and putting
 * the divider inside sidesteps it.
 */
const STEPS = [
  {
    number: '01',
    title: 'Registracija',
    description:
      'Otvoriš nalog u minuti i dobijaš pristup pregledu svih objavljenih kurseva, programa i uvodnih lekcija.',
  },
  {
    number: '02',
    title: 'Odabir kursa',
    description:
      'Upisuješ pojedinačne kurseve, bez obaveze i bez roka. Materijali ostaju dostupni i nakon što završiš.',
  },
  {
    number: '03',
    title: 'Učenje i zadaci',
    description:
      'Prolaziš lekcije svojim tempom i predaješ zadatke kada ti odgovara. Predavač ih pregleda i piše konkretnu povratnu informaciju.',
  },
  {
    number: '04',
    title: 'Certifikat',
    description:
      'Kada su svi zadaci ocijenjeni i završni ispit položen, certifikat je odmah dostupan za preuzimanje i dijeljenje.',
  },
];

export default function HowItWorks() {
  return (
    <Section id="kako-funkcionise" tone="plain">
      <Reveal>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
            Kako funkcioniše
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 38 } }}>
            Četiri koraka od registracije do certifikata
          </Typography>
        </Stack>
      </Reveal>

      <Stack spacing={0}>
        {STEPS.map((step, index) => (
          <React.Fragment key={step.number}>
            {index > 0 && <Divider />}
            <Reveal delay={index * 70}>
              <Grid
                container
                spacing={2}
                sx={{
                  py: 3,
                  px: { xs: 0, md: 2 },
                  mx: { xs: 0, md: -2 },
                  borderRadius: 2,
                  alignItems: 'center',
                  transition: 'background-color 160ms ease',
                  '&:hover': { bgcolor: 'action.hover' },
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
              >
                <Grid size={{ xs: 12, md: 2 }}>
                  <Box
                    sx={{
                      display: 'inline-grid',
                      placeItems: 'center',
                      minWidth: 44,
                      height: 44,
                      px: 1,
                      borderRadius: '999px',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {step.number}
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="h5" component="h3">
                    {step.title}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {step.description}
                  </Typography>
                </Grid>
              </Grid>
            </Reveal>
          </React.Fragment>
        ))}
      </Stack>
    </Section>
  );
}
