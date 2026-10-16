'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AuthCard from '@/components/AuthCard';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/env';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      // Routed through the callback so the recovery code is exchanged for a
      // session before the reset form loads.
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
    });

    // Deliberately ignores the result: reporting whether the address exists
    // would turn this form into an account-enumeration oracle.
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <AuthCard title="Provjerite email">
        <Stack spacing={2}>
          <Alert severity="info">
            Ako postoji nalog za <strong>{email}</strong>, poslali smo link za postavljanje nove
            lozinke.
          </Alert>
          <Link href="/login" variant="body2">
            Nazad na prijavu
          </Link>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Zaboravljena lozinka"
      subtitle="Poslat ćemo vam email s linkom za postavljanje nove lozinke."
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={pending}>
            {pending ? 'Slanje…' : 'Pošalji link'}
          </Button>
          <Link href="/login" variant="body2">
            Nazad na prijavu
          </Link>
        </Stack>
      </form>
    </AuthCard>
  );
}
