'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import MarkdownEditor from '@/components/markdown/MarkdownEditor';
import QueryState from '@/components/feedback/QueryState';
import { useLegalDocument, useUpdateLegalDocument } from '@/hooks/useSiteContent';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { LegalDocument, LegalSlug } from '@/lib/schemas/legal.schema';

const TABS: { slug: LegalSlug; label: string; href: string }[] = [
  { slug: 'terms', label: 'Uvjeti korištenja', href: '/uvjeti-koristenja' },
  { slug: 'privacy', label: 'Politika privatnosti', href: '/politika-privatnosti' },
];

/**
 * The editor for one document.
 *
 * Two controls — a title field and `<MarkdownEditor>` — rather than the form
 * kit: there is no validation here worth `useZodForm` and `<Form>`, which exist
 * for a set of fields that can be wrong *as a set*.
 *
 * The editor stores raw Markdown and previews it with the same renderer the
 * public page uses, so an admin who has never seen Markdown can work from the
 * toolbar and still see exactly what will ship.
 *
 * Keyed on the slug by the parent so switching tabs remounts it — otherwise the
 * `useState` below would keep the previous document's text, which is the same
 * trap as a permanently-mounted dialog holding the previous row's values.
 */
function LegalEditor({ document: doc }: { document: LegalDocument }) {
  const update = useUpdateLegalDocument(doc.slug);

  const [title, setTitle] = React.useState(doc.title);
  const [content, setContent] = React.useState(doc.content);

  const dirty = title !== doc.title || content !== doc.content;

  async function save() {
    try {
      await update.mutateAsync({ title: title.trim(), content });
      toast.success('Dokument je sačuvan.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Stack spacing={2}>
      {doc.content.trim() === '' ? (
        <Alert severity="warning">
          Ovaj dokument je prazan i na javnoj stranici se prikazuje kao „još nije objavljen”.
        </Alert>
      ) : null}

      <TextField
        label="Naslov"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={update.isPending}
      />

      {/*
        The preview pane here renders through `<MarkdownContent>`, the same
        component the public page uses — so this is not an approximation of the
        published document, it is the published document.
      */}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        disabled={update.isPending}
        helperText="Koristite alatnu traku iznad za naslove, podebljano, liste i linkove. Tekst se čuva u Markdown formatu."
      />

      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="caption" color="text.secondary">
          Zadnja izmjena: {formatDateTime(doc.updated_at)}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button href={TABS.find((t) => t.slug === doc.slug)!.href} color="inherit" size="small">
            Otvori javnu stranicu
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={!dirty || update.isPending || title.trim() === ''}
          >
            {update.isPending ? 'Čuvanje…' : 'Sačuvaj'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

/**
 * Terms and privacy, editable without a deploy.
 *
 * Deliberately *not* the blog treatment. The blog is a typed array in the repo
 * because publishing there should be a code review — but a privacy policy
 * changes in response to a lawyer or a regulator, sometimes urgently, and
 * needing a release to correct one is the wrong trade.
 */
export default function AdminLegalSettingsPage() {
  const [tab, setTab] = React.useState<LegalSlug>('terms');
  const document = useLegalDocument(tab);

  // Not `maxWidth="form"`: the editor is a split pane, and at form width each
  // half is too narrow to write or read in.
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/admin' }, { label: 'Pravni dokumenti' }]}
        title="Pravni dokumenti"
        description="Uvjeti korištenja i politika privatnosti, vidljivi svim posjetiocima."
      />

      <ContentCard disablePadding>
        <Tabs
          value={tab}
          onChange={(_event, next: LegalSlug) => setTab(next)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((item) => (
            <Tab key={item.slug} value={item.slug} label={item.label} />
          ))}
        </Tabs>

        <Stack sx={{ p: 2.5 }}>
          <QueryState skeleton="form" query={document} errorTitle="Dokument nije moguće učitati">
            {/* Keyed on the slug: switching tabs must reset the editor's local
                state to the newly loaded document. */}
            {(data) => <LegalEditor key={data.slug} document={data} />}
          </QueryState>
        </Stack>
      </ContentCard>
    </PageContainer>
  );
}
