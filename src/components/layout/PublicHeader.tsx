'use client';

import Typography from '@mui/material/Typography';
import Logo from '@/components/layout/Logo';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import AppHeader from '@/components/layout/AppHeader';
import { useAuthStore } from '@/store/useAuthStore';
import { FEATURES } from '@/lib/features';

/**
 * Top bar for the public-facing pages.
 *
 * ## A signed-in visitor gets the ordinary app bar
 *
 * The public pages are reachable while signed in — the catalogue, a course, the
 * blog — and there is no reason the chrome should change just because the page
 * underneath happens to be public. So once the session resolves, this hands
 * over to `<AppHeader />`, the same bar used everywhere else.
 *
 * What is left here is the genuinely different case: a **stranger**. They have
 * no name, no role and nothing to sign out of, and what they need instead is a
 * way in. That is the only reason this component still exists.
 *
 * While the session is resolving it renders a skeleton rather than the
 * signed-out state, or a signed-in visitor would watch the header flip from
 * "Prijavi se" to their own name on every page load.
 */
export default function PublicHeader() {
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);

  // App links, not the marketing ones below — see "Public pages do not mix in"
  // on `<AppHeader>`.
  if (profile) return <AppHeader />;

  return (
    <AppBar position="sticky" color="inherit" sx={{ bgcolor: 'background.paper' }}>
      <Toolbar sx={{ gap: 2, minHeight: { xs: 64, sm: 64 } }}>
        <Typography variant="h5" color="text.primary">
          <Logo />
        </Typography>

        <Stack
          component="nav"
          aria-label="Glavna navigacija"
          direction="row"
          spacing={2.5}
          sx={{ ml: 2, display: { xs: 'none', sm: 'flex' } }}
        >
          <Link href="/" variant="body2" underline="hover" color="text.secondary">
            Početna
          </Link>
          {FEATURES.catalog ? (
            <Link href="/courses" variant="body2" underline="hover" color="text.secondary">
              Kursevi
            </Link>
          ) : null}
          <Link href="/#kako-funkcionise" variant="body2" underline="hover" color="text.secondary">
            Kako funkcioniše
          </Link>
          {FEATURES.blog ? (
            <Link href="/blog" variant="body2" underline="hover" color="text.secondary">
              Blog
            </Link>
          ) : null}
          <Link href="/kontakt" variant="body2" underline="hover" color="text.secondary">
            Kontakt
          </Link>
        </Stack>

        <Box sx={{ flex: 1 }} />

        {loading ? (
          <Skeleton variant="rounded" width={160} height={36} />
        ) : (
          <Stack direction="row" spacing={1}>
            <Button href="/login" size="small">
              Prijavi se
            </Button>
            <Button href="/register" variant="contained" size="small">
              Registruj se
            </Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
}
