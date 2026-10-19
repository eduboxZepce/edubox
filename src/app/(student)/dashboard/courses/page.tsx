'use client';

import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import PaginationBar from '@/components/data/PaginationBar';
import StudentCourseCard from '@/components/student/StudentCourseCard';
import { usePurchases } from '@/hooks/usePurchases';
import { useListParams } from '@/hooks/useListParams';
import { FEATURES } from '@/lib/features';

/**
 * The courses this student can actually open.
 *
 * ## There is no enrolment table
 *
 * An **approved purchase is the enrolment** — that is the whole model. So this
 * lists the student's own approved purchases and renders the course embedded on
 * each. RLS scopes them to the caller automatically; the `status` filter is
 * what separates "mine" from "asked for but not granted", which lives on the
 * purchases page instead.
 *
 * The course embed is nullable: a course can be deleted after its purchase was
 * approved, so a row with no course is skipped rather than rendered as a card
 * with no name.
 *
 * Paginated, unlike the old dashboard section that asked for fifty and hoped.
 * Progress is fetched per card — see `<StudentCourseCard>` for why that is one
 * request each rather than one for the page.
 */
export default function StudentCoursesPage() {
  const list = useListParams({}, { pageSize: 12 });
  const purchases = usePurchases({ ...list.queryParams, status: 'approved' });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/dashboard' }, { label: 'Moje obuke' }]}
        title="Moje obuke"
        description="Nastavite tamo gdje ste stali."
      />

      <QueryState
        query={purchases}
        errorTitle="Obuke nije moguće učitati"
        isEmpty={(page) => page.data.length === 0}
        empty={
          <ContentCard>
            <EmptyState
              title="Još niste upisani ni na jednu obuku"
              description={
                FEATURES.catalog
                  ? 'Pronađite obuku u katalogu i pošaljite zahtjev za pristup.'
                  : 'Obuke kojima imate pristup pojavit će se ovdje.'
              }
              action={
                FEATURES.catalog ? (
                  <Button href="/courses" variant="contained" startIcon={<ExploreOutlinedIcon />}>
                    Pregledaj obuke
                  </Button>
                ) : undefined
              }
            />
          </ContentCard>
        }
      >
        {(page) => (
          <>
            <Grid container spacing={3}>
              {page.data.map((purchase) =>
                purchase.courses ? (
                  <Grid key={purchase.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <StudentCourseCard course={purchase.courses} />
                  </Grid>
                ) : null,
              )}
            </Grid>

            <PaginationBar meta={page.meta} onChange={list.setPage} />
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
