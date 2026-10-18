import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import MarkdownContent from '@/components/markdown/MarkdownContent';
import { getLegalDocument } from '@/lib/server/legal';
import { formatDate } from '@/lib/format';
import type { LegalSlug } from '@/lib/schemas/legal.schema';

/**
 * Renders one legal document from the database (migration 0030).
 *
 * Shared by `/uvjeti-koristenja` and `/politika-privatnosti`, which differ only
 * in which row they ask for — the rest of the page is identical, and two copies
 * would drift.
 *
 * ## A Server Component
 *
 * This was a Client Component fetching through React Query, which meant the
 * text arrived only after hydration and the server sent a page with nothing in
 * it. Wrong twice over for a legal document: a crawler sees an empty page, and
 * a reader whose JavaScript is slow or blocked is shown a shell where the
 * agreement should be.
 *
 * It reads on the server now, so the text is in the initial HTML — confirmed by
 * asserting against the raw response rather than by looking at a browser, which
 * is the only way to tell the two apart.
 *
 * ## An empty document says so
 *
 * Both rows are seeded with empty content, so "not written yet" is a real state
 * rather than an error. It renders as a notice, never as a blank page: an
 * apparently-complete but empty terms page is worse than an honest placeholder,
 * because a visitor would take it as the actual agreement.
 *
 * The text is Markdown, rendered by `<MarkdownContent>` — the same renderer the
 * blog uses and the same one the admin editor previews with, so what an admin
 * approved in the editor is what appears here.
 */
export default async function LegalDocumentPage({
  slug,
  fallbackTitle,
}: {
  slug: LegalSlug;
  /** Used when the row is missing entirely, so the page still has a heading. */
  fallbackTitle: string;
}) {
  const document = await getLegalDocument(slug);

  return (
    <PageContainer maxWidth="form">
      <PageHeader title={document?.title ?? fallbackTitle} />

      {!document || document.content.trim() === '' ? (
        <Alert severity="info">
          Ovaj dokument još nije objavljen. Ako ti je potreban prije objave, javi nam se putem
          kontakt stranice.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <ContentCard>
            <MarkdownContent content={document.content} />
          </ContentCard>

          <Typography variant="caption" color="text.secondary">
            Zadnje ažuriranje: {formatDate(document.updated_at)}
          </Typography>
        </Stack>
      )}
    </PageContainer>
  );
}
