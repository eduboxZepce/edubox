import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import AuthBackdrop from '@/components/auth/AuthBackdrop';

/**
 * Chrome for the auth pages: one centred card, and deliberately no nav bar.
 *
 * Signing in is a single-purpose screen — offering links away from it is how
 * you lose someone mid-task — which is exactly why these pages could not share
 * a layout with the marketing side. See the note in `(marketing)/layout.tsx`.
 *
 * The centring lives here rather than in `<AuthCard>` so that a page in this
 * group gets the shell for free, the same way a marketing page gets the header.
 * `AuthCard` is now just the card.
 *
 * ## The background
 *
 * `<AuthBackdrop>` — a brand-tinted wash with drifting bokeh lights. It
 * replaced two faint radial tints and a grid, which were too quiet to read as
 * anything but an off-white page. The card is frosted glass over it (see
 * `<AuthCard>`), so the lights show through softly instead of stopping dead
 * at its edge.
 *
 * ## The legal links
 *
 * No nav, but a quiet footer with the terms and privacy policy: someone
 * creating an account is exactly who should be able to read them, and every
 * public page links to the privacy policy.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        // Card and legal links packed together in the middle, rather than the
        // two grid rows splitting the viewport height between them.
        alignContent: 'center',
        p: 2,
        position: 'relative',
      }}
    >
      <AuthBackdrop />
      {/* Above the fixed backdrop. */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {children}
      </Box>
      <Stack
        component="footer"
        direction="row"
        spacing={2}
        sx={{ position: 'relative', zIndex: 1, mt: 2, justifyContent: 'center' }}
      >
        <Link href="/uvjeti-koristenja" variant="caption" color="text.secondary">
          Uvjeti korištenja
        </Link>
        <Link href="/politika-privatnosti" variant="caption" color="text.secondary">
          Politika privatnosti
        </Link>
      </Stack>
    </Box>
  );
}
