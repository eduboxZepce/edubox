import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContactForm from '@/components/contact/ContactForm';
import { SITE } from '@/lib/siteConfig';
import { pageMetadata } from '@/lib/seo';
import { FEATURES } from '@/lib/features';

export const metadata = pageMetadata({
  title: 'Kontakt',
  description: `Pitanja o obukama, upisu, plaćanju ili certifikatu? Piši timu platforme ${SITE.name} ili nazovi radnim danima — u pravilu odgovaramo ${SITE.service.replyTime}.`,
  path: '/kontakt',
});

/**
 * Contact page - form on the left, direct contact details and a few
 * "read this first" links on the right.
 *
 * Every contact detail comes from `SITE.contact` in siteConfig.ts,
 * shared with PublicFooter, so the two can't disagree.
 *
 * The form itself lives in <ContactForm> (a Client Component, for its
 * local state); this page stays a Server Component around it.
 */
export default function ContactPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={0.75} sx={{ mb: 3, maxWidth: 640 }}>
        <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
          Kontakt
        </Typography>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 28, md: 36 } }}>
          Pitaj nas prije nego se upišeš
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Odgovaramo radnim danima, u pravilu {SITE.service.replyTime}. Za pitanja o pojedinoj obuci
          navedi njen naziv, kako bismo ti brže odgovorili.
        </Typography>
      </Stack>

      <Divider sx={{ mb: { xs: 3, md: 4 } }} />

      <Grid container spacing={{ xs: 4, md: 6 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ContactForm />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            <Stack spacing={1.75}>
              <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
                Direktan kontakt
              </Typography>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Link href={`mailto:${SITE.contact.email}`} variant="h6" underline="hover">
                  {SITE.contact.email}
                </Link>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Telefon
                </Typography>
                <Link href={`tel:${SITE.contact.phone.tel}`} variant="h6" underline="hover">
                  {SITE.contact.phone.display}
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {SITE.contact.hours}
                </Typography>
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
                Prije nego pišeš
              </Typography>

              <Stack spacing={0.75}>
                <Link href="/#kako-funkcionise" underline="hover" color="text.primary">
                  Kako funkcionira upis i učenje
                </Link>
                {FEATURES.catalog ? (
                  <Link href="/courses" underline="hover" color="text.primary">
                    Pregled objavljenih obuka
                  </Link>
                ) : null}
                <Link href="/#cesta-pitanja" underline="hover" color="text.primary">
                  Česta pitanja o certifikatu
                </Link>
                <Link href="/uvjeti-koristenja" underline="hover" color="text.primary">
                  Uvjeti korištenja i plaćanje
                </Link>
                <Link href="/politika-privatnosti" underline="hover" color="text.primary">
                  Politika privatnosti
                </Link>
              </Stack>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
