'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AuthCard, { AuthCardProgress } from '@/components/AuthCard';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/env';

export default function RegisterPage() {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [consent, setConsent] = React.useState(false);
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
    if (!consent) {
      setError(
        'Za otvaranje naloga potrebno je prihvatiti uvjete korištenja i politiku privatnosti.',
      );
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `full_name` is consumed by the handle_new_user() trigger to populate
        // profiles.full_name. `terms_accepted_at` is only recorded: it stays in
        // auth.users.raw_user_meta_data as the record of when this person
        // agreed, which is what someone asking "did they accept?" will need.
        data: { full_name: fullName.trim(), terms_accepted_at: new Date().toISOString() },
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
      <AuthCard title="Provjeri email">
        <Stack spacing={2}>
          <Alert severity="success">
            Poslali smo link za potvrdu na <strong>{email}</strong>. Klikni na njega da aktiviraš
            nalog, a zatim se prijavi.
          </Alert>
          <Link href="/login" variant="body2">
            Nazad na prijavu
          </Link>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Kreiraj nalog" subtitle="Počni učiti za par minuta.">
      <AuthCardProgress active={pending} />
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
            label="Potvrdi lozinku"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={passwordMismatch}
            helperText={passwordMismatch ? 'Lozinke se ne podudaraju.' : ' '}
            required
          />

          {/* The links open in a new tab: following one in place would throw
              away everything typed into the form above. */}
          <FormControlLabel
            control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
            label={
              <Typography variant="body2">
                Prihvatam{' '}
                <Link href="/uvjeti-koristenja" target="_blank" rel="noopener">
                  uvjete korištenja
                </Link>{' '}
                i{' '}
                <Link href="/politika-privatnosti" target="_blank" rel="noopener">
                  politiku privatnosti
                </Link>
                .
              </Typography>
            }
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!consent}
            loading={pending}
            loadingPosition="start"
          >
            {pending ? 'Kreiranje naloga…' : 'Kreiraj nalog'}
          </Button>

          <Link href="/login" variant="body2">
            Već imaš nalog? Prijavi se
          </Link>
        </Stack>
      </form>

      {/* Renders nothing unless NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true" and
          NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
          Gated on the same checkbox: signing up through Google creates an
          account just the same, so it needs the same consent. */}
      <GoogleSignInButton text="signup_with" disabled={!consent} />
    </AuthCard>
  );
}
