'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AuthCard, { AuthCardProgress } from '@/components/AuthCard';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { createClient } from '@/lib/supabase/client';
import { landingPathForRole, useAuthStore, type AuthProfile } from '@/store/useAuthStore';

/**
 * Errors `/auth/callback` sends back as `?error=…`. Without these, an expired
 * confirmation or recovery link lands on a plain login form with no word about
 * what went wrong. (Google sign-in no longer passes through the callback; it
 * reports its own errors in place.)
 */
const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: 'Link za prijavu nije ispravan. Pokušaj ponovo.',
  invalid_or_expired_link: 'Link je istekao ili je već iskorišten. Pokušaj ponovo.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setProfile = useAuthStore((s) => s.setProfile);
  const redirectTo = searchParams.get('redirectTo');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(
    () => CALLBACK_ERRORS[searchParams.get('error') ?? ''] ?? null,
  );
  const [pending, setPending] = React.useState(false);
  // Sign-in succeeded and the landing page is loading. That wait has no
  // request of its own on screen, so without saying so it feels like the
  // button simply stopped responding.
  const [redirecting, setRedirecting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Supabase returns a generic "Invalid login credentials" for both a wrong
      // password and an unknown email, which is the behaviour we want — don't
      // rewrite it into something that reveals which.
      setError(
        signInError.message === 'Email nije potvrđen'
          ? 'Potvrdi svoju email adresu prije prijave. Link za potvrdu stigao ti je na email.'
          : signInError.message,
      );
      setPending(false);
      return;
    }

    setRedirecting(true);

    // Read the role to pick a landing page, and seed the store so the next page
    // does not flash an unauthenticated state.
    const res = await fetch('/api/me', { cache: 'no-store' });
    const profile: AuthProfile | null = res.ok ? ((await res.json()).profile ?? null) : null;
    if (profile) setProfile(profile);

    router.replace(
      redirectTo && redirectTo.startsWith('/') ? redirectTo : landingPathForRole(profile?.role),
    );
    router.refresh();
  }

  return (
    <>
      <AuthCardProgress active={pending} />

      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {redirecting ? (
            <Alert severity="success">Prijava je uspjela. Otvaramo tvoju stranicu…</Alert>
          ) : null}
          {/* Set by the reset-password page after a successful change. */}
          {!error && !redirecting && searchParams.get('reset') === 'success' ? (
            <Alert severity="success">Lozinka je promijenjena. Prijavi se novom lozinkom.</Alert>
          ) : null}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={pending}
            required
          />
          <TextField
            label="Lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={pending}
            required
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            loading={pending}
            loadingPosition="start"
          >
            {redirecting ? 'Učitavanje…' : pending ? 'Prijavljivanje…' : 'Prijavi se'}
          </Button>

          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Link href="/register" variant="body2">
              Kreiraj nalog
            </Link>
            <Link href="/forgot-password" variant="body2">
              Zaboravljena lozinka?
            </Link>
          </Stack>
        </Stack>
      </form>

      {/* Renders nothing unless NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true" and
          NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. */}
      <GoogleSignInButton text="signin_with" redirectTo={redirectTo ?? undefined} />
    </>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering. The card sits outside it, so its title — the
  // page's <h1> — is in the server HTML rather than appearing after hydration.
  return (
    <AuthCard title="Prijava" subtitle="Drago nam je što si opet tu.">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </AuthCard>
  );
}
