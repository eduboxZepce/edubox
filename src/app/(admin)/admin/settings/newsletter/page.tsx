'use client';

import * as React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import DataTable from '@/components/data/DataTable';
import MarkdownEditor from '@/components/markdown/MarkdownEditor';
import { useNewsletterRecipients, useSendNewsletter } from '@/hooks/useNewsletter';
import { errorMessage } from '@/lib/api/errorMessage';
import { pluralBs } from '@/lib/format';
import { toast } from '@/store/useToastStore';

/**
 * The newsletter: who is subscribed, exporting them, and sending.
 *
 * ## Both halves, deliberately
 *
 * Sending from the app works — the message is composed as a heading plus
 * paragraphs and goes through the same template as every other mail, so it is
 * properly formatted rather than raw HTML pasted into a box. But the export is
 * kept alongside it, because it is the half that works *today*: with
 * `EMAIL_FROM` unset every send is skipped and logged, and an admin who needs
 * to reach subscribers through some other tool should not be blocked on that.
 *
 * ## Markdown, not raw HTML
 *
 * The body is written in the same editor the legal documents use, so an author
 * gets headings, links, lists and images without knowing the syntax. What is
 * *stored and sent* is Markdown — `renderMarkdownEmail` decides the actual
 * markup, with every style inlined, because email clients have no stylesheet
 * (Outlook renders with Word; Gmail strips `<style>`).
 *
 * That keeps the original guarantee: an admin still cannot paste markup that
 * breaks the layout or that a filter reads as phishing, because raw HTML inside
 * the Markdown is escaped rather than honoured.
 *
 * Images are pasted or dropped straight in. They upload to a public bucket and
 * are referenced by URL, never inlined as base64 — no major mail client renders
 * a `data:` image, so the message would arrive with broken boxes.
 */
export default function AdminNewsletterPage() {
  const recipients = useNewsletterRecipients();
  const send = useSendNewsletter();

  const [subject, setSubject] = React.useState('');
  const [heading, setHeading] = React.useState('');
  const [body, setBody] = React.useState('');
  const [confirming, setConfirming] = React.useState(false);

  const emails = (recipients.data?.data ?? []).map((r) => r.email);
  const emailConfigured = recipients.data?.meta.email_configured ?? false;

  const canSend =
    subject.trim() !== '' && heading.trim() !== '' && body.trim() !== '' && emails.length > 0;

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      toast.success('Email adrese su kopirane.');
    } catch {
      toast.info('Kopiranje nije dozvoljeno — označite i kopirajte ručno.');
    }
  }

  function downloadCsv() {
    const rows = [
      ['Ime i prezime', 'Email'],
      ...(recipients.data?.data ?? []).map((r) => [r.full_name, r.email]),
    ];
    /*
     * Quotes doubled and every field wrapped: a name containing a comma would
     * otherwise split into two columns, which is how mailing lists end up with
     * "Anić" as somebody's email address.
     */
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    // A BOM, so Excel opens it as UTF-8 and does not mangle č/ć/š/ž/đ.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'newsletter-primaoci.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function doSend() {
    try {
      const result = await send.mutateAsync({
        subject: subject.trim(),
        heading: heading.trim(),
        body,
      });
      setConfirming(false);

      if (result.data.sent > 0) {
        toast.success(`Poslano: ${result.data.sent}.`);
      } else if (result.data.skipped > 0) {
        toast.info(
          `Slanje je preskočeno za ${result.data.skipped} primalaca — email nije konfiguriran.`,
        );
      } else {
        toast.error('Nijedan email nije poslan.');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/admin' }, { label: 'Newsletter' }]}
        title="Newsletter"
        description="Korisnici koji su pristali na primanje novosti."
      />

      {!emailConfigured ? (
        <Alert severity="warning">
          Slanje emaila trenutno nije konfigurirano (<code>EMAIL_FROM</code> nije postavljen), pa
          slanje iz aplikacije neće ništa poslati. Do tada koristite izvoz adresa ispod.
        </Alert>
      ) : null}

      <ContentCard
        title="Primaoci"
        description={
          recipients.data
            ? `${recipients.data.meta.total} ${pluralBs(recipients.data.meta.total, 'korisnik', 'korisnika', 'korisnika')} prima newsletter.`
            : undefined
        }
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void copyEmails()}
              disabled={emails.length === 0}
            >
              Kopiraj adrese
            </Button>
            <Button size="small" onClick={downloadCsv} disabled={emails.length === 0}>
              Preuzmi CSV
            </Button>
          </Stack>
        }
        disablePadding
      >
        <QueryState
          skeleton="table"
          query={recipients}
          errorTitle="Primaoce nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              title="Još niko nije pristao"
              description="Korisnici se prijavljuju sami, u svojim postavkama."
            />
          }
        >
          {(page) => (
            <DataTable
              rows={page.data}
              getRowId={(row) => row.id}
              columns={[
                { id: 'name', header: 'Ime i prezime', cell: (row) => row.full_name },
                { id: 'email', header: 'Email', cell: (row) => row.email },
              ]}
            />
          )}
        </QueryState>
      </ContentCard>

      <ContentCard
        title="Nova poruka"
        description="Naslovi, linkovi, liste i slike. Pregled desno pokazuje kako će poruka izgledati."
      >
        <Stack spacing={2}>
          <TextField
            label="Naslov emaila (subject)"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={send.isPending}
            helperText="Ovo se vidi u listi poruka, prije nego što je iko otvori."
          />
          <TextField
            label="Naslov u poruci"
            value={heading}
            onChange={(event) => setHeading(event.target.value)}
            disabled={send.isPending}
          />
          <MarkdownEditor
            value={body}
            onChange={setBody}
            disabled={send.isPending}
            allowImages
            helperText="Sliku možete prevući ili nalijepiti (Ctrl+V) direktno u tekst — automatski se učitava i ubacuje."
          />

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setConfirming(true)}
              disabled={!canSend || send.isPending}
            >
              {send.isPending ? 'Slanje…' : `Pošalji (${emails.length})`}
            </Button>
          </Stack>
        </Stack>
      </ContentCard>

      <ConfirmDialog
        open={confirming}
        title="Poslati newsletter?"
        description={`Poruka će biti poslana na ${emails.length} ${pluralBs(emails.length, 'adresu', 'adrese', 'adresa')}. Email se ne može povući nakon slanja.`}
        confirmLabel="Pošalji"
        severity="primary"
        pending={send.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void doSend()}
      />
    </PageContainer>
  );
}
