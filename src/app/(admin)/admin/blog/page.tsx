'use client';

import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import SearchField from '@/components/data/SearchField';
import PaginationBar from '@/components/data/PaginationBar';
import BlogPostTable from '@/components/blog/BlogPostTable';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { useListParams } from '@/hooks/useListParams';

/**
 * The blog, as admins manage it. Same shape as the course list: search,
 * `<QueryState>`, a table whose ⋮ menu owns edit and delete.
 *
 * A post is public the moment it is saved — there is no draft state — so the
 * list has no status filter.
 */
export default function AdminBlogPage() {
  const list = useListParams({});
  const posts = useBlogPosts(list.queryParams);

  return (
    <PageContainer>
      <PageHeader
        title="Blog"
        description="Članci na javnoj stranici bloga, najnoviji prvi. Sačuvan članak je odmah objavljen."
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button href="/blog" variant="outlined" target="_blank" rel="noopener">
              Otvori blog
            </Button>
            <Button href="/admin/blog/new" variant="contained" startIcon={<AddIcon />}>
              Novi članak
            </Button>
          </Stack>
        }
      />

      <ContentCard disablePadding>
        <Stack sx={{ p: 2.5, maxWidth: { md: 400 } }}>
          <SearchField
            value={list.search}
            onChange={list.setSearch}
            placeholder="Pretraži po naslovu, sažetku ili temi…"
          />
        </Stack>

        <QueryState
          skeleton="table"
          query={posts}
          errorTitle="Članke nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                title="Nema rezultata"
                description="Nijedan članak ne odgovara pretrazi."
                action={
                  <Button variant="outlined" onClick={list.reset}>
                    Poništi pretragu
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Još nema članaka"
                description="Napišite prvi članak — bit će vidljiv na stranici bloga čim ga sačuvate."
                action={
                  <Button href="/admin/blog/new" variant="contained" startIcon={<AddIcon />}>
                    Novi članak
                  </Button>
                }
              />
            )
          }
        >
          {(page) => (
            <>
              <BlogPostTable posts={page.data} />
              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
