'use client';

import NextLink from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SupportOutlinedIcon from '@mui/icons-material/SupportOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import StatCard from '@/components/data/StatCard';
import StatusChip from '@/components/data/StatusChip';
import { useAdminCourses } from '@/hooks/useCourses';
import { useAdminPurchases } from '@/hooks/usePurchases';
import { useAdminSubmissions } from '@/hooks/useSubmissions';
import { useIssues } from '@/hooks/useIssues';
import { useAdminUsers } from '@/hooks/useUsers';
import { formatDate, formatPrice } from '@/lib/format';
import { publishStatus } from '@/lib/status';
import { useAuthStore } from '@/store/useAuthStore';
import { FEATURES } from '@/lib/features';

/**
 * Admin landing page.
 *
 * A client component because every number on it comes from a React Query hook.
 * The role check already happened in the group layout, so there is none here.
 *
 * ### Counting without fetching
 *
 * Each stat asks for `pageSize: 1` and reads `meta.total`. Every list endpoint
 * returns an exact count alongside the page, so one row comes back over the
 * wire instead of hundreds. Reach for this whenever you need a count rather
 * than the records themselves.
 */
export default function AdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';

  // Every one of these is already scoped by the caller's role — a teacher's
  // course list is filtered to what they own, and RLS narrows purchases and
  // submissions to their own courses. So the same four hooks give an admin
  // platform totals and a teacher their own, with no branching here.
  const courses = useAdminCourses({ pageSize: 1 });
  const publishedCourses = useAdminCourses({ pageSize: 1, published: true });
  const pendingPurchases = useAdminPurchases(
    { pageSize: 1, status: 'requested' },
    { enabled: FEATURES.purchases },
  );
  const pendingSubmissions = useAdminSubmissions(
    { pageSize: 1, status: 'pending' },
    { enabled: FEATURES.tasks },
  );

  // Users are platform-wide administration; the endpoint is admin-only, so a
  // teacher must not even ask for it.
  const users = useAdminUsers({ pageSize: 1 }, { enabled: isAdmin });

  /*
   * Support is admin-only too, and for a reason worth keeping: `/api/issues` is
   * RLS-scoped, so a teacher asking would get *their own* tickets rather than
   * the queue — a number that looks like a work queue but is not one. The
   * dashboard predates support existing, which is why this tile is a late
   * addition rather than part of the original four.
   */
  const openIssues = useIssues(
    { pageSize: 1, status: 'open' },
    { enabled: isAdmin && FEATURES.support },
  );

  // The one list that fetches real rows — the five most recent courses.
  const recentCourses = useAdminCourses({ pageSize: 5 });

  // Which tiles exist depends on the role and on the feature flags, so the
  // span is worked out from the count rather than written per case: 12 split
  // evenly, which Grid accepts as a fraction (12/5 = 2.4).
  const tileCount = [
    true,
    FEATURES.purchases,
    FEATURES.tasks,
    isAdmin,
    isAdmin && FEATURES.support,
  ].filter(Boolean).length;
  const statSpan = 12 / tileCount;

  return (
    <PageContainer>
      <PageHeader
        title="Pregled"
        description={
          profile ? `Dobrodošli nazad, ${profile.full_name}.` : 'Stanje platforme na jednom mjestu.'
        }
        actions={
          <Button href="/admin/courses/new" variant="contained" startIcon={<AddIcon />}>
            Nova obuka
          </Button>
        }
      />

      {/*
        Up to five tiles for an admin, three for a teacher, fewer when a
        feature is switched off. `statSpan` divides the row evenly rather than
        leaving a five-tile set wrapping 4 + 1.
      */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: statSpan }}>
          <StatCard
            label={isAdmin ? 'Ukupno obuka' : 'Moje obuke'}
            value={courses.data?.meta.total}
            icon={LibraryBooksOutlinedIcon}
            href="/admin/courses"
            loading={courses.isPending}
            error={courses.isError}
          />
        </Grid>

        {FEATURES.purchases ? (
          <Grid size={{ xs: 12, sm: 6, lg: statSpan }}>
            <StatCard
              label="Zahtjevi na čekanju"
              value={pendingPurchases.data?.meta.total}
              icon={ReceiptLongOutlinedIcon}
              href="/admin/purchases"
              loading={pendingPurchases.isPending}
              error={pendingPurchases.isError}
              highlight
            />
          </Grid>
        ) : null}

        {FEATURES.tasks ? (
          <Grid size={{ xs: 12, sm: 6, lg: statSpan }}>
            <StatCard
              label="Zadaci za pregled"
              value={pendingSubmissions.data?.meta.total}
              icon={AssignmentTurnedInOutlinedIcon}
              href="/admin/submissions"
              loading={pendingSubmissions.isPending}
              error={pendingSubmissions.isError}
              highlight
            />
          </Grid>
        ) : null}

        {isAdmin ? (
          <Grid size={{ xs: 12, sm: 6, lg: statSpan }}>
            <StatCard
              label="Registrirani korisnici"
              value={users.data?.meta.total}
              icon={PeopleOutlinedIcon}
              href="/admin/users"
              loading={users.isPending}
              error={users.isError}
            />
          </Grid>
        ) : null}

        {isAdmin && FEATURES.support ? (
          <Grid size={{ xs: 12, sm: 6, lg: statSpan }}>
            <StatCard
              label="Otvoreni zahtjevi za podršku"
              value={openIssues.data?.meta.total}
              icon={SupportOutlinedIcon}
              href="/admin/issues"
              loading={openIssues.isPending}
              error={openIssues.isError}
              highlight
            />
          </Grid>
        ) : null}
      </Grid>

      <ContentCard
        title="Nedavno dodane obuke"
        description={
          publishedCourses.data && courses.data
            ? `${publishedCourses.data.meta.total} od ${courses.data.meta.total} obuka je objavljeno.`
            : undefined
        }
        actions={
          <Button href="/admin/courses" size="small">
            Sve obuke
          </Button>
        }
        disablePadding
      >
        <QueryState
          skeleton="list"
          query={recentCourses}
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              title="Još nema obuka"
              description="Kreirajte prvu obuku da biste počeli."
              action={
                <Button href="/admin/courses/new" variant="contained" startIcon={<AddIcon />}>
                  Nova obuka
                </Button>
              }
            />
          }
        >
          {(page) => (
            <Stack divider={<Divider />}>
              {page.data.map((course) => (
                <Stack
                  key={course.id}
                  component={NextLink}
                  href={`/admin/courses/${course.id}/edit`}
                  direction="row"
                  spacing={2}
                  sx={{
                    px: 3,
                    py: 2,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {course.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kreiran {formatDate(course.created_at)}
                    </Typography>
                  </Stack>

                  {/*
                    Fixed widths, not `spacing` alone: prices and status labels
                    vary in length, so right-aligning each row independently
                    left the column edges ragged down the list. Reserving the
                    same width on every row is what makes them read as columns.
                  */}
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ width: 96, textAlign: 'right' }}
                      noWrap
                    >
                      {formatPrice(course.price)}
                    </Typography>
                    <Box sx={{ width: 104, display: 'flex', justifyContent: 'flex-end' }}>
                      <StatusChip {...publishStatus(course.published)} />
                    </Box>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
