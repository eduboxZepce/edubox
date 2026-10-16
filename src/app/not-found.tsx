import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageContainer from '@/components/layout/PageContainer';
import ContentCard from '@/components/layout/ContentCard';
import EmptyState from '@/components/feedback/EmptyState';
import { FEATURES } from '@/lib/features';

export const metadata = { title: 'Stranica nije pronađena' };

/**
 * 404, for an unmatched URL anywhere and for any `notFound()` without a nearer
 * handler.
 *
 * A Server Component: there is nothing interactive here, and keeping it on the
 * server means a mistyped URL costs no JavaScript.
 *
 * It renders inside the root layout, so it has the theme but none of the group
 * chrome — a 404 cannot know which section it was meant to be in, and guessing
 * would put an admin sidebar around a stranger's typo.
 */
export default function NotFound() {
  return (
    <PageContainer>
      <ContentCard>
        <EmptyState
          icon={<SearchOffOutlinedIcon />}
          title="Stranica nije pronađena"
          titleComponent="h1"
          description="Adresa koju ste otvorili ne postoji, ili je sadržaj u međuvremenu uklonjen."
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button href="/" variant="contained">
                Početna
              </Button>
              {FEATURES.catalog ? (
                <Button href="/courses" color="inherit">
                  Pogledaj kurseve
                </Button>
              ) : null}
            </Stack>
          }
        />
      </ContentCard>
    </PageContainer>
  );
}
