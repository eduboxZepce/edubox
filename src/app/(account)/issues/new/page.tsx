'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { useCreateIssue } from '@/hooks/useIssues';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';

/**
 * Raising an issue: a subject and a first message.
 *
 * Two plain fields with local state rather than the `useZodForm` kit. The kit
 * earns its keep where several fields can be wrong in relation to each other;
 * here the only rule is "both non-empty", and wiring a resolver for that would
 * be more machinery than the screen has substance.
 *
 * The API is still the boundary — it enforces the same limits whatever this
 * page sends.
 */
export default function NewIssuePage() {
  const router = useRouter();
  const create = useCreateIssue();

  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !create.isPending;

  async function submit() {
    try {
      const { data } = await create.mutateAsync({ subject: subject.trim(), body: body.trim() });
      toast.success('Zahtjev je poslan. Odgovorit ćemo vam u ovoj prepisci.');
      router.push(`/issues/${data.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[{ label: 'Podrška', href: '/issues' }, { label: 'Novi zahtjev' }]}
        title="Novi zahtjev"
        description="Opišite problem ili pitanje. Administrator odgovara u istoj prepisci, a vi dobivate obavještenje."
      />

      <ContentCard>
        <Stack spacing={2.5}>
          <TextField
            label="Naslov"
            placeholder="Ukratko o čemu se radi"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={create.isPending}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />

          <TextField
            label="Opis"
            placeholder="Što se dogodilo, na kojoj stranici, što ste očekivali…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            multiline
            rows={8}
            disabled={create.isPending}
            slotProps={{ htmlInput: { maxLength: 10000 } }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" disabled={!canSubmit} onClick={() => void submit()}>
              {create.isPending ? 'Slanje…' : 'Pošalji zahtjev'}
            </Button>
            <Button href="/issues" color="inherit" startIcon={<ArrowBackIcon />}>
              Odustani
            </Button>
          </Stack>
        </Stack>
      </ContentCard>
    </PageContainer>
  );
}
