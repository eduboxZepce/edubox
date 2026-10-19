'use client';

import * as React from 'react';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import DataTable, { type DataTableColumn } from '@/components/data/DataTable';
import StatCard from '@/components/data/StatCard';
import StatusChip from '@/components/data/StatusChip';
import { useAdminCourse, useCourseStats } from '@/hooks/useCourses';
import { formatDate } from '@/lib/format';
import { publishStatus } from '@/lib/status';
import { progressPercent } from '@/lib/courseAccess';
import { isStatus } from '@/lib/api/errorMessage';
import { FEATURES } from '@/lib/features';
import type { CourseStats } from '@/lib/schemas/courses.schema';

type StudentRow = CourseStats['students'][number];

/** Four tiles with everything on; the purchases and submissions ones are flagged. */
const statSpan = 12 / [true, true, FEATURES.purchases, FEATURES.tasks].filter(Boolean).length;

/** Spread into the student table's columns — empty when certificates are off. */
const certificateColumn: DataTableColumn<StudentRow>[] = FEATURES.certificates
  ? [
      {
        id: 'certificate',
        header: 'Certifikat',
        cell: (s) =>
          s.certificate ? (
            // Staff may open it — RLS admits the admin and the owning teacher
            // alongside the student.
            <Link
              href={`/certificates/${s.certificate.readable_id}`}
              underline="hover"
              variant="body2"
              onClick={(event) => event.stopPropagation()}
            >
              {s.certificate.readable_id}
            </Link>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
    ]
  : [];

/**
 * One course, seen from the teaching side: how many people are on it, how far
 * they have got, and what is waiting on a decision.
 *
 * ## Why this page exists
 *
 * Everything here was technically knowable before — by opening the purchases
 * list, filtering it, then opening the submissions queue, then the certificates
 * list, and joining the three by hand. A teacher's actual question is "how is
 * my course going", and nothing answered it.
 *
 * It is the landing point for a course now, with editing one click away rather
 * than the other way round: an admin or teacher opens a course far more often
 * to look than to change something.
 *
 * Admins see any course; a teacher only their own — the endpoint checks
 * ownership, so a teacher opening someone else's id gets a 403 rather than an
 * empty page.
 */
export default function AdminCourseOverviewPage(props: PageProps<'/admin/courses/[id]'>) {
  const { id } = React.use(props.params);

  const course = useAdminCourse(id);
  const stats = useCourseStats(id);

  if (course.isError && isStatus(course.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState
            title="Obuka nije pronađena"
            description="Ova obuka ne postoji ili nemate pristup njoj."
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState query={course} errorTitle="Obuku nije moguće učitati">
        {(row) => (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Obuke', href: '/admin/courses' }, { label: row.name }]}
              title={row.name}
              description={row.description ?? undefined}
              actions={
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <StatusChip {...publishStatus(row.published)} size="medium" />
                  <Button
                    href={`/admin/courses/${id}/modules`}
                    startIcon={<LibraryBooksOutlinedIcon />}
                  >
                    Moduli
                  </Button>
                  <Button
                    href={`/admin/courses/${id}/edit`}
                    variant="contained"
                    startIcon={<EditOutlinedIcon />}
                  >
                    Izmijeni
                  </Button>
                </Stack>
              }
            />

            <QueryState query={stats} errorTitle="Statistiku nije moguće učitati">
              {(data) => (
                <>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: statSpan }}>
                      <StatCard
                        label="Upisanih studenata"
                        value={data.enrolled_count}
                        icon={PeopleOutlinedIcon}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: statSpan }}>
                      <StatCard
                        label="Završilo obuku"
                        value={data.completed_count}
                        icon={WorkspacePremiumOutlinedIcon}
                      />
                    </Grid>
                    {FEATURES.purchases ? (
                      <Grid size={{ xs: 6, md: statSpan }}>
                        <StatCard
                          label="Zahtjeva na čekanju"
                          value={data.requested_count}
                          icon={ReceiptLongOutlinedIcon}
                          href={`/admin/purchases?courseId=${id}`}
                        />
                      </Grid>
                    ) : null}
                    {FEATURES.tasks ? (
                      <Grid size={{ xs: 6, md: statSpan }}>
                        <StatCard
                          label="Rješenja za pregled"
                          value={data.pending_submissions}
                          icon={AssignmentTurnedInOutlinedIcon}
                          href={`/admin/submissions?courseId=${id}`}
                        />
                      </Grid>
                    ) : null}
                  </Grid>

                  {FEATURES.tasks && data.pending_submissions > 0 ? (
                    <ContentCard>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{ alignItems: { sm: 'center' } }}
                      >
                        <AssignmentTurnedInOutlinedIcon color="action" />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {data.pending_submissions} predanih rješenja čeka vaš pregled na ovoj
                          obuci.
                        </Typography>
                        <Button
                          href={`/admin/submissions?courseId=${id}`}
                          variant="contained"
                          sx={{ flexShrink: 0 }}
                        >
                          Otvori predaje
                        </Button>
                      </Stack>
                    </ContentCard>
                  ) : null}

                  <ContentCard
                    title="Studenti na obuci"
                    description={`${data.module_count} ${data.module_count === 1 ? 'modul' : 'modula'} · napredak po studentu`}
                    disablePadding
                  >
                    {data.students.length === 0 ? (
                      <EmptyState
                        title="Još nema upisanih studenata"
                        description={
                          FEATURES.purchases && data.requested_count > 0
                            ? 'Postoje zahtjevi koji čekaju odobrenje.'
                            : 'Kada student dobije pristup, pojavit će se ovdje.'
                        }
                      />
                    ) : (
                      <DataTable<StudentRow>
                        rows={data.students}
                        getRowId={(s) => s.student_id}
                        onRowClick={(s) => `/admin/users/${s.student_id}`}
                        columns={[
                          {
                            id: 'student',
                            header: 'Student',
                            cell: (s) => (
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {s.full_name ?? 'Nepoznat korisnik'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.email ?? '—'}
                                </Typography>
                              </Stack>
                            ),
                          },
                          {
                            id: 'progress',
                            header: 'Napredak',
                            width: 220,
                            cell: (s) => {
                              const percent = progressPercent(s.completed_modules, s.module_count);
                              return (
                                <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {s.completed_modules} / {s.module_count} modula · {percent}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={percent}
                                    aria-label="Napredak studenta"
                                    sx={{ height: 6, borderRadius: 3 }}
                                  />
                                </Stack>
                              );
                            },
                          },
                          ...certificateColumn,
                          {
                            id: 'enrolled',
                            header: 'Upisan',
                            cell: (s) => (
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(s.enrolled_at)}
                              </Typography>
                            ),
                          },
                        ]}
                      />
                    )}
                  </ContentCard>
                </>
              )}
            </QueryState>
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
