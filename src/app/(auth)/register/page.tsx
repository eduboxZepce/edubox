'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AuthCard from '@/components/AuthCard';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/env';

export default function RegisterPage() {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);

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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Consumed by the handle_new_user() trigger to populate profiles.full_name.
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${publicEnv.siteUrl}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    // No redirect: the account is unusable until the email is confirmed.
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <AuthCard title="Provjerite email">
        <Stack spacing={2}>
          <Alert severity="success">
            Poslali smo link za potvrdu na <strong>{email}</strong>. Kliknite na njega da aktivirate
            nalog, a zatim se prijavite.
          </Alert>
          <Link href="/login" variant="body2">
            Nazad na prijavu
          </Link>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Kreiraj nalog" subtitle="Počnite učiti za par minuta.">
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Ime i prezime"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <TextField
            label="Lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Najmanje 8 znakova."
            required
          />
          <TextField
            label="Potvrdite lozinku"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={passwordMismatch}
            helperText={passwordMismatch ? 'Lozinke se ne podudaraju.' : ' '}
            required
          />

          <Button type="submit" variant="contained" size="large" disabled={pending}>
            {pending ? 'Kreiranje naloga…' : 'Kreiraj nalog'}
          </Button>

          <Link href="/login" variant="body2">
            Već imate nalog? Prijavite se
          </Link>
        </Stack>
      </form>

      {/* Renders nothing unless NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true". */}
      <GoogleSignInButton label="Registruj se sa Google nalogom" />
    </AuthCard>
  );
}
