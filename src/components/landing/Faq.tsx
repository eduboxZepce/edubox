import * as React from 'react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Reveal from '@/components/landing/Reveal';
import Section from '@/components/landing/Section';
import { pluralBs } from '@/lib/format';
import { SITE } from '@/lib/siteConfig';

/**
 * "Pitanja koja dobijamo najčešće" — the FAQ.
 *
 * ## Every answer is open, deliberately
 *
 * An accordion would be shorter, but these are five short answers, and the
 * questions themselves are what a hesitant visitor is scanning for. Collapsing
 * them would hide the reassurance behind a click and take the text out of the
 * first thing a crawler reads. Dividers between items are rendered manually,
 * for the same reason as in `<HowItWorks>`.
 *
 * ## The panel is sticky, and used to have an arbitrary height
 *
 * It was `height: '50%'`, which is half of whatever the row happened to be —
 * a number with no meaning that left the panel floating in its column. It now
 * sizes to its content and sticks while the answers scroll past, so the heading
 * stays with what it is heading. `top` clears the sticky app bar.
 *
 * It also ends with the way out: an unanswered question is the one case where a
 * FAQ has failed, and the fix is a link to somebody who can answer it.
 */
const FAQS = [
  {
    question: 'Koliko traje pristup materijalima?',
    answer:
      'Pristup je trajan. Nakon što upišeš kurs, lekcije i materijali ostaju u tvom nalogu i poslije završetka.',
  },
  {
    question: 'Da li postoje fiksni rokovi i predavanja u realnom vremenu?',
    answer: 'Ne. Kursevi su asinhroni — učiš kada možeš. Jedini rokovi su oni koje sam postaviš.',
  },
  {
    question: 'Ko pregleda moje zadatke?',
    answer: `Predavač kursa ili njegov asistent. Povratnu informaciju u pravilu dobijaš u roku od ${SITE.service.reviewHours} ${pluralBs(SITE.service.reviewHours, 'sat', 'sata', 'sati')} od predaje.`,
  },
  {
    question: 'Šta je potrebno da dobijem certifikat?',
    answer:
      'Pregledani i prihvaćeni svi praktični zadaci i položen završni ispit. Certifikat se generiše automatski.',
  },
  {
    question: 'Kako se plaća?',
    answer:
      'Kartično plaćanje ili uplatnica, po kursu. Za firme i grupne upise izdajemo fakturu — placeholder, uvjeti se dopunjuju.',
  },
];

export default function Faq() {
  return (
    <Section id="cesta-pitanja" tone="plain">
      <Grid container spacing={{ xs: 4, md: 6 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Reveal>
            <Box sx={{ position: { md: 'sticky' }, top: 88 }}>
              <Stack spacing={2.5}>
                <Stack spacing={1}>
                  <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
                    Česta pitanja
                  </Typography>
                  <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 38 } }}>
                    Pitanja koja dobijamo najčešće
                  </Typography>
                </Stack>

                <Typography variant="body1" color="text.secondary">
                  Nema odgovora na tvoje pitanje? Javi nam se — odgovaramo {SITE.service.replyTime}.
                </Typography>

                <Button
                  href="/kontakt"
                  variant="outlined"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ alignSelf: 'flex-start', borderColor: 'divider', color: 'text.primary' }}
                >
                  Kontaktiraj nas
                </Button>
              </Stack>
            </Box>
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={0}>
            {FAQS.map((faq, index) => (
              <React.Fragment key={faq.question}>
                {index > 0 && <Divider />}
                <Reveal delay={index * 60}>
                  <Stack spacing={1} sx={{ py: 3 }}>
                    <Typography variant="h5" component="h3">
                      {faq.question}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </Stack>
                </Reveal>
              </React.Fragment>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Section>
  );
}
