'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import SearchField from '@/components/data/SearchField';
import FilterSelect from '@/components/data/FilterSelect';
import PaginationBar from '@/components/data/PaginationBar';
import CourseCard from '@/components/courses/CourseCard';
import { useCourses } from '@/hooks/useCourses';
import { useCategoryOptions } from '@/hooks/useCategories';
import { useListParams } from '@/hooks/useListParams';

/**
 * The public course catalogue — the body of `/courses`.
 *
 * A Client Component, because search, filters and paging are interactive. The
 * route's `page.tsx` is a Server Component around it, which is what lets the
 * page export metadata at all.
 *
 * `GET /api/courses` returns published courses only — that is enforced in the
 * route and by RLS, not by a filter here — so this page is safe to render for
 * anyone, signed in or not.
 *
 * ## Why it doesn't reuse `<CourseGrid>`
 *
 * That component is the *admin* grid: it hardcodes an `/admin/courses/{id}/edit`
 * href and renders `<CourseActions>` in each footer. `<CourseCard>` underneath it
 * was written to serve both audiences, and it already takes `href` and
 * `showStatus` as props, so the catalogue composes the card directly rather than
 * teaching the grid a second mode.
 *
 * `showStatus` stays off here on purpose — "Nacrt" is an editorial state, and
 * every course on this page is published by definition.
 */
export default function CourseCatalogue() {
  /*
   * `?categoryId=` is how the footer's category links land here pre-filtered.
   * Read for the initial state, and synced afterwards: a footer click while
   * already on /courses changes the URL without remounting this component.
   */
  const urlCategoryId = useSearchParams().get('categoryId') ?? '';
  const list = useListParams({ categoryId: urlCategoryId }, { pageSize: 12 });
  const { setFilter } = list;
  React.useEffect(() => {
    setFilter('categoryId', urlCategoryId);
  }, [urlCategoryId, setFilter]);

  const courses = useCourses(list.queryParams);
  const categories = useCategoryOptions();

  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { md: 'center' } }}
      >
        <Stack sx={{ flex: 1, minWidth: 0, maxWidth: { md: 360 } }}>
          <SearchField
            value={list.search}
            onChange={list.setSearch}
            placeholder="Pretraži kurseve…"
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
      </Stack>

      <QueryState
        skeleton="grid"
        query={courses}
        errorTitle="Kurseve nije moguće učitati"
        isEmpty={(page) => page.data.length === 0}
        empty={
          list.hasActiveFilters ? (
            <EmptyState
              title="Nema rezultata"
              description="Nijedan kurs ne odgovara zadatoj pretrazi. Pokušaj s drugim pojmom ili kategorijom."
            />
          ) : (
            <EmptyState
              title="Još nema objavljenih kurseva"
              description="Uskoro dodajemo sadržaj — svrati ponovo."
            />
          )
        }
      >
        {(page) => (
          <>
            <Grid container spacing={2}>
              {page.data.map((course) => (
                <Grid key={course.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <CourseCard
                    course={course}
                    // Slug, not id: this is the canonical public address.
                    href={`/courses/${course.slug}`}
                    categoryName={
                      course.category_id ? categories.names.get(course.category_id) : undefined
                    }
                  />
                </Grid>
              ))}
            </Grid>

            <PaginationBar meta={page.meta} onChange={list.setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
