'use client';

import * as React from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import SearchField from '@/components/data/SearchField';
import PaginationBar from '@/components/data/PaginationBar';
import DataTable from '@/components/data/DataTable';
import CategoryActions from '@/components/categories/CategoryActions';
import CategoryFormDialog from '@/components/categories/CategoryFormDialog';
import { useCategories } from '@/hooks/useCategories';
import { useListParams } from '@/hooks/useListParams';
import { formatCourseCount, formatDate } from '@/lib/format';
import type { CategoryWithCount } from '@/lib/schemas/categories.schema';

/**
 * Categories — list, create, edit and delete, all on one screen.
 *
 * A category is a name and nothing else, so the usual list → detail → edit-page
 * chain would be three navigations to change one word. Create and edit both open
 * `<CategoryFormDialog>` instead, and the admin never leaves the list. That
 * trade only works because the resource is this small; a course earns its own
 * pages.
 *
 * Structurally it is still the standard admin list screen — `useListParams` for
 * state, `<QueryState
          skeleton="table">` for the four states, `<DataTable>` for the rows — so it
 * reads the same as users, purchases and certificates.
 *
 * There is no filter bar beyond search: with one column worth filtering on and
 * typically a dozen rows, a filter would be UI for its own sake.
 */
export default function AdminCategoriesPage() {
  const list = useListParams({}, { pageSize: 20 });
  const categories = useCategories(list.queryParams);

  // `true` while the create dialog is open. Editing is owned per-row by
  // `<CategoryActions>`, so this only tracks the one dialog the page itself opens.
  const [creating, setCreating] = React.useState(false);

  return (
    <PageContainer>
      <PageHeader
        title="Kategorije"
        description="Kategorije po kojima se obuke grupiraju i filtriraju."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Nova kategorija
          </Button>
        }
      />

      <ContentCard disablePadding>
        <Stack sx={{ p: 2.5, maxWidth: { md: 360 } }}>
          <SearchField
            value={list.search}
            onChange={list.setSearch}
            placeholder="Pretraži kategorije…"
          />
        </Stack>

        <QueryState
          query={categories}
          errorTitle="Kategorije nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                title="Nema rezultata"
                description="Nijedna kategorija ne odgovara zadanoj pretrazi."
              />
            ) : (
              <EmptyState
                title="Još nema kategorija"
                description="Kategorije grupiraju obuke i pomažu studentima da se snađu u katalogu."
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreating(true)}
                  >
                    Nova kategorija
                  </Button>
                }
              />
            )
          }
        >
          {(page) => (
            <>
              <DataTable<CategoryWithCount>
                rows={page.data}
                getRowId={(category) => category.id}
                // No `onRowClick`: a category has no detail page, and nothing on
                // it needs more room than the row already gives.
                columns={[
                  {
                    id: 'name',
                    header: 'Naziv',
                    cell: (category) => (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {category.name}
                      </Typography>
                    ),
                  },
                  {
                    id: 'courses',
                    header: 'Obuke',
                    cell: (category) => (
                      <Typography
                        variant="body2"
                        // An unused category is the one worth spotting — it's
                        // the only kind that deletes without consequence.
                        color={category.course_count > 0 ? 'text.primary' : 'text.disabled'}
                      >
                        {category.course_count > 0
                          ? formatCourseCount(category.course_count)
                          : 'Nema obuka'}
                      </Typography>
                    ),
                  },
                  {
                    id: 'created',
                    header: 'Kreirana',
                    cell: (category) => (
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(category.created_at)}
                      </Typography>
                    ),
                  },
                  {
                    id: 'actions',
                    header: '',
                    align: 'right',
                    width: 112,
                    cell: (category) => <CategoryActions category={category} />,
                  },
                ]}
              />

              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>

      {/* Mounted only while open, so each open starts from a blank form. */}
      {creating ? <CategoryFormDialog category={null} onClose={() => setCreating(false)} /> : null}
    </PageContainer>
  );
}
