'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AuthCard, { AuthCardProgress } from '@/components/AuthCard';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false);

  // Reached via the emailed link, which establishes a temporary recovery
  // session. Without one there is nothing to update, so say so rather than
  // failing on submit.
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(!!data.session);
      setChecking(false);
    });
  }, []);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju.');
      return;
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova.');
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    // Force a fresh sign-in with the new password.
    await supabase.auth.signOut();
    router.replace('/login?reset=success');
  }

  if (checking) return null;

  if (!hasRecoverySession) {
    return (
      <AuthCard title="Link je istekao">
        <Alert severity="warning">
          Link za postavljanje lozinke nije ispravan ili je istekao. Zatraži novi na stranici{' '}
          <Link href="/forgot-password">Zaboravljena lozinka</Link>.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nova lozinka">
      <AuthCardProgress active={pending} />
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Nova lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Najmanje 8 znakova."
            required
          />
          <TextField
            label="Potvrdi novu lozinku"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={passwordMismatch}
            helperText={passwordMismatch ? 'Lozinke se ne podudaraju.' : ' '}
            required
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            loading={pending}
            loadingPosition="start"
          >
            {pending ? 'Čuvanje…' : 'Sačuvaj lozinku'}
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
