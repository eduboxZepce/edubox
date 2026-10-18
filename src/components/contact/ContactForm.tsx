'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { toast } from '@/store/useToastStore';
import { SITE } from '@/lib/siteConfig';
import TextField from '@mui/material/TextField';

/**
 * The public contact form ("Posalji upit").
 *
 * POSTs to /api/contact
 *
 * A Client Component: needs local state for the controlled fields and
 * the consent checkbox.
 */
export default function ContactForm() {
  const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Request failed');

      toast.success('Upit je poslan. Odgovorit ćemo ti uskoro na navedeni email.');
      setValues({ name: '', email: '', subject: '', message: '' });
      setConsent(false);
    } catch {
      toast.error(
        'Trenutno ne možemo poslati upit ovim putem — koristi „Pošalji email direktno” ispod.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
          Pošalji upit
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Ime i prezime"
            placeholder="Amina Hodžić"
            value={values.name}
            onChange={handleChange('name')}
            required
            fullWidth
          />
          <TextField
            label="Email adresa"
            type="email"
            placeholder="amina@primjer.ba"
            value={values.email}
            onChange={handleChange('email')}
            required
            fullWidth
          />
        </Stack>

        <TextField
          label="Tema upita"
          placeholder="Npr. Uvod u web razvoj – pitanje o zadacima"
          value={values.subject}
          onChange={handleChange('subject')}
          required
          fullWidth
        />

        <TextField
          label="Poruka"
          placeholder="Napiši nam u nekoliko rečenica šta te zanima."
          value={values.message}
          onChange={handleChange('message')}
          required
          fullWidth
          multiline
          minRows={4}
        />

        <FormControlLabel
          control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
          label={
            <Typography variant="body2">
              Pročitao/la sam{' '}
              <Link component={NextLink} href="/politika-privatnosti">
                politiku privatnosti
              </Link>{' '}
              i pristajem na obradu podataka radi odgovora na upit.
            </Typography>
          }
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
          <Button type="submit" variant="contained" size="large" disabled={!consent || submitting}>
            {submitting ? 'Slanje…' : 'Pošalji upit'}
          </Button>
          <Link
            href={`mailto:${SITE.contact.email}`}
            underline="hover"
            color="primary"
            sx={{ fontWeight: 600 }}
          >
            Pošalji email direktno
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}
