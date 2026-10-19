'use client';

import * as React from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import SearchField from '@/components/data/SearchField';
import FilterSelect from '@/components/data/FilterSelect';
import PaginationBar from '@/components/data/PaginationBar';
import ViewModeToggle, { type ViewMode } from '@/components/data/ViewModeToggle';
import CourseGrid from '@/components/courses/CourseGrid';
import CourseTable from '@/components/courses/CourseTable';
import { useAdminCourses } from '@/hooks/useCourses';
import { useCategoryOptions } from '@/hooks/useCategories';
import { useListParams } from '@/hooks/useListParams';

/**
 * Admin course listing — search, filter, paginate, in a grid or a table.
 *
 * Reference example for every list page that follows. The parts worth copying:
 *
 *   - `useListParams` owns page/search/filter state and resets to page 1 when
 *     a filter changes, so nobody re-derives that rule per page.
 *   - `<QueryState>` renders loading/error/empty; the page only describes the
 *     loaded case.
 *   - The empty state distinguishes "nothing exists yet" (offer to create one)
 *     from "your filter matched nothing" (offer to clear it). Collapsing those
 *     into one message is the most common mistake on a page like this.
 */
export default function AdminCoursesPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');

  // Filter values are strings because that's what a <select> yields; '' means
  // "no filter" and `useListParams` drops it from the request.
  const list = useListParams({ published: '', categoryId: '' }, { pageSize: 12 });

  const courses = useAdminCourses(list.queryParams);
  const categories = useCategoryOptions();

  return (
    <PageContainer>
      <PageHeader
        title="Obuke"
        description="Sve obuke, uključujući i one koje još nisu objavljene."
        actions={
          <Button href="/admin/courses/new" variant="contained" startIcon={<AddIcon />}>
            Nova obuka
          </Button>
        }
      />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <Stack sx={{ flex: 1, minWidth: 0, maxWidth: { md: 360 } }}>
            <SearchField
              value={list.search}
              onChange={list.setSearch}
              placeholder="Pretraži po nazivu ili opisu…"
            />
          </Stack>

          <FilterSelect
            label="Kategorija"
            value={list.filters.categoryId}
            onChange={(value) => list.setFilter('categoryId', value)}
            disabled={categories.isPending}
            allLabel="Sve kategorije"
            options={categories.options}
          />

          <FilterSelect
            label="Status"
            value={list.filters.published}
            onChange={(value) => list.setFilter('published', value)}
            allLabel="Svi statusi"
            width={180}
            options={[
              { value: 'true', label: 'Objavljene' },
              { value: 'false', label: 'Nacrti' },
            ]}
          />

          <Stack sx={{ ml: { md: 'auto' } }}>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </Stack>
        </Stack>

        <QueryState
          skeleton="table"
          query={courses}
          errorTitle="Obuke nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                title="Nema rezultata"
                description="Nijedna obuka ne odgovara zadanoj pretrazi i filterima."
                action={
                  <Button variant="outlined" onClick={list.reset}>
                    Poništi filtere
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Još nema obuka"
                description="Kreirajte prvu obuku — kasnije joj dodajete module, kvizove i zadatke."
                action={
                  <Button href="/admin/courses/new" variant="contained" startIcon={<AddIcon />}>
                    Nova obuka
                  </Button>
                }
              />
            )
          }
        >
          {(page) => (
            <>
              {viewMode === 'list' ? (
                <CourseTable courses={page.data} categoryNames={categories.names} />
              ) : (
                <Stack sx={{ p: 2.5, pt: 0 }}>
                  <CourseGrid courses={page.data} categoryNames={categories.names} />
                </Stack>
              )}

              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
