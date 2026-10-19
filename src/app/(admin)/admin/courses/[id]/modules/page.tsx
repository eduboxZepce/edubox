'use client';

import * as React from 'react';
import NextLink from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ModuleActions from '@/components/modules/ModuleActions';
import { useAdminCourse } from '@/hooks/useCourses';
import { useCourseModules, useUpdateModule } from '@/hooks/useModules';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { pluralBs } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { ModuleWithFiles } from '@/lib/schemas/modules.schema';

/**
 * The modules of one course — open, edit, reorder, delete.
 *
 * ## Why this list lives under a course
 *
 * There is no `/admin/modules` and there should not be. A module has no meaning
 * outside its course, and every read endpoint is course-scoped
 * (`/api/courses/:courseId/modules`). The course id comes from the URL.
 *
 * ## Why not `<DataTable>`
 *
 * The other admin lists are column configs, but a module row is a *sequence*
 * position with move controls attached — the ordering is the point, and a
 * column config cannot express a row that knows whether it is first or last.
 * The row markup follows `components/courses/ModuleList.tsx` instead, which
 * already renders a numbered module row.
 */
export default function AdminCourseModulesPage(props: PageProps<'/admin/courses/[id]/modules'>) {
  // `params` is a Promise in Next 16; a Client Component unwraps it with `use`.
  const { id: courseId } = React.use(props.params);

  const course = useAdminCourse(courseId);

  // The modules endpoint is purchase-gated for students, but an admin — or the
  // teacher who owns this course — reads it freely. A 403 here as a teacher
  // means the course is not yours.
  const modules = useCourseModules(courseId);
  const updateModule = useUpdateModule();

  /**
   * Swap one module with its neighbour.
   *
   * `order` drives the student's sequential unlock, so this is not cosmetic.
   * There is no bulk-reorder endpoint, so a move is two PATCHes — the pair whose
   * positions exchange. Fine for a handful of modules; if courses ever grow
   * large, that is the moment to add a proper endpoint rather than firing N
   * requests.
   *
   * The two writes are sequential rather than concurrent so that a failure on
   * the second leaves a state we can describe: both rows briefly share an
   * `order`, which the unlock rule tolerates (`unlockedModuleIds` sorts and
   * de-duplicates), and a refetch shows the truth.
   */
  async function handleMove(list: ModuleWithFiles[], index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;

    const a = list[index];
    const b = list[target];

    try {
      await updateModule.mutateAsync({ id: a.id, body: { order: b.order } });
      await updateModule.mutateAsync({ id: b.id, body: { order: a.order } });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  // A teacher opening someone else's course lands here as a 404 (see
  // `GET /api/admin/courses/:id`). Say so, rather than render the header over a
  // module list that is about to 403.
  if (course.isError && isStatus(course.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState
            title="Obuka nije pronađena"
            description="Ova obuka ne postoji ili nemate pristup njoj."
            action={
              <Button href="/admin/courses" variant="contained">
                Nazad na obuke
              </Button>
            }
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Obuke', href: '/admin/courses' },
          { label: course.data?.name ?? 'Obuka', href: `/admin/courses/${courseId}/edit` },
          { label: 'Moduli' },
        ]}
        title="Moduli"
        description="Redoslijed modula određuje kojim redom ih studenti otključavaju."
        actions={
          <Button
            href={`/admin/courses/${courseId}/modules/new`}
            variant="contained"
            startIcon={<AddIcon />}
          >
            Novi modul
          </Button>
        }
      />

      <ContentCard disablePadding>
        {/* A move is two requests; the bar keeps the row from looking stuck. */}
        {updateModule.isPending ? <LinearProgress /> : null}

        <QueryState
          skeleton="list"
          query={modules}
          errorTitle="Module nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              title="Obuka još nema module"
              description="Dodajte prvi modul — redoslijed možete mijenjati kasnije."
              action={
                <Button
                  href={`/admin/courses/${courseId}/modules/new`}
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  Novi modul
                </Button>
              }
            />
          }
        >
          {(page) => (
            <Stack divider={<Divider />}>
              {page.data.map((currentModule, index) => {
                const fileCount = currentModule.module_files.length;
                const editHref = `/admin/courses/${courseId}/modules/${currentModule.id}/edit`;

                return (
                  <Stack
                    key={currentModule.id}
                    direction="row"
                    spacing={2}
                    sx={{ px: 3, py: 2, alignItems: 'center' }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                      }}
                    >
                      {index + 1}
                    </Box>

                    {/* The title is the link, so the row is openable by click,
                        keyboard and middle-click without the whole row having
                        to fake being an anchor around the action buttons. */}
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        component={NextLink}
                        href={editHref}
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {currentModule.title}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        {currentModule.video_url ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <VideocamOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">
                              Video
                            </Typography>
                          </Stack>
                        ) : null}

                        {fileCount > 0 ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <AttachFileIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">
                              {fileCount}{' '}
                              {pluralBs(fileCount, 'materijal', 'materijala', 'materijala')}
                            </Typography>
                          </Stack>
                        ) : null}

                        {!currentModule.video_url && fileCount === 0 ? (
                          <Typography variant="caption" color="text.disabled">
                            Bez sadržaja
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>

                    <ModuleActions
                      currentModule={currentModule}
                      courseId={courseId}
                      canMoveUp={index > 0}
                      canMoveDown={index < page.data.length - 1}
                      isMoving={updateModule.isPending}
                      onMove={(direction) => void handleMove(page.data, index, direction)}
                    />
                  </Stack>
                );
              })}
            </Stack>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
