import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

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
 * A flat `background.default` left the card floating on an empty grey field.
 * This is two soft radial tints in the brand colours over that same base, plus
 * a faint grid.
 *
 * Built from `color-mix()` against the theme's own palette tokens rather than
 * hardcoded rgba, so it follows the colour scheme: in dark mode the tints mix
 * toward the dark background instead of glowing. `currentColor`-free and
 * CSS-only — no image to load, and nothing that shifts layout while it arrives.
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
        bgcolor: 'background.default',
        backgroundImage: [
          // Two off-centre pools of colour, primary top-left and secondary
          // bottom-right, so the card sits in the calmer middle.
          'radial-gradient(70rem 40rem at 12% -10%, color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent), transparent 60%)',
          'radial-gradient(60rem 38rem at 105% 108%, color-mix(in srgb, var(--mui-palette-secondary-main) 14%, transparent), transparent 60%)',
        ].join(', '),
        // The grid sits above the gradients but below the card. Masked to fade
        // out toward the edges so it never reads as a hard-edged texture.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(var(--mui-palette-divider) 1px, transparent 1px)',
            'linear-gradient(90deg, var(--mui-palette-divider) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
          opacity: 0.35,
          maskImage: 'radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 100%)',
        },
      }}
    >
      {/* Above the ::before grid. */}
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
        sx={{ position: 'relative', zIndex: 1, mt: 3, justifyContent: 'center' }}
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
