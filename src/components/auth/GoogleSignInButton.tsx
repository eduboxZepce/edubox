'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createClient } from '@/lib/supabase/client';
import { FEATURES } from '@/lib/features';

/**
 * "Continue with Google".
 *
 * ## Where the configuration actually lives
 *
 * Not in this app. Supabase performs the OAuth dance itself, so the client id
 * and secret are entered in the **Supabase dashboard** (Authentication →
 * Providers → Google), not in `.env.local` — the app never sees them, which is
 * why there is no "is it configured" check here to gate the button.
 *
 * `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` is the switch that matters to the UI: with
 * the provider disabled in Supabase, clicking this returns a 400 and the user
 * gets an error for something they cannot fix. Setting it to `true` is the last
 * step after the dashboard is configured.
 *
 * ## Redirect
 *
 * `redirectTo` points at the existing `/auth/callback` handler, which already
 * exchanges a code for a session and lands the user by role — the same path
 * email confirmation uses. The provider's redirect URI in both Google Cloud and
 * Supabase must be the Supabase callback (`<project>.supabase.co/auth/v1/callback`),
 * not this one; this is only where Supabase sends the browser afterwards.
 */
export default function GoogleSignInButton({
  label = 'Nastavi sa Google nalogom',
  redirectTo,
}: {
  label?: string;
  /** Path to land on after sign-in; defaults to the role landing page. */
  redirectTo?: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Rendering a provider button that cannot work is worse than not offering it,
  // so the whole block is opt-in.
  if (!FEATURES.googleAuth) return null;

  async function signIn() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL('/auth/callback', window.location.origin);
    if (redirectTo?.startsWith('/')) callback.searchParams.set('next', redirectTo);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });

    // On success the browser is already navigating away, so this only runs when
    // the provider is disabled or misconfigured.
    if (oauthError) {
      setError('Prijava putem Google naloga trenutno nije dostupna.');
      setPending(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Divider>
        <Typography variant="caption" color="text.secondary">
          ili
        </Typography>
      </Divider>

      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="inherit"
        onClick={() => void signIn()}
        disabled={pending}
        startIcon={<GoogleMark />}
      >
        {pending ? 'Preusmjeravanje…' : label}
      </Button>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}

/**
 * Google's mark, inline.
 *
 * Inline SVG rather than a remote image: the brand guidelines require the
 * four-colour "G" unaltered, and a hotlinked asset would be a third-party
 * request on the login page — one that fails closed to a broken image icon.
 */
function GoogleMark() {
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: 18, height: 18 }} aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Box>
  );
}
