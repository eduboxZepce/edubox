'use client';

import * as React from 'react';
import Image from 'next/image';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import PageContainer from '@/components/layout/PageContainer';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import QueryState from '@/components/feedback/QueryState';
import ModuleList, { type ModuleListItem } from '@/components/courses/ModuleList';
import CoursePurchasePanel from '@/components/courses/CoursePurchasePanel';
import CourseProgressSummary from '@/components/courses/CourseProgressSummary';
import { useCourse, useCourseOutline } from '@/hooks/useCourses';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { useCourseProgress } from '@/hooks/useProgress';
import { useCertificates } from '@/hooks/useCertificates';
import { useCategoryOptions } from '@/hooks/useCategories';
import { unlockedModuleIds } from '@/lib/courseAccess';
import { isStatus } from '@/lib/api/errorMessage';
import { courseThumbnailUrl } from '@/lib/storage';
import { FEATURES } from '@/lib/features';

/**
 * Course page body — public, but shows four different things depending on
 * who's looking.
 *
 * The route's `page.tsx` is a Server Component that renders this and owns
 * everything a crawler reads without JavaScript: metadata and structured data.
 * Everything here depends on the signed-in viewer, so it stays on the client.
 *
 * | Viewer                        | Modules            | Right column |
 * | ----------------------------- | ------------------ | ------------ |
 * | Signed out                    | titles, all locked | price + CTA  |
 * | Signed in, no purchase        | titles, all locked | price + CTA  |
 * | Signed in, approved purchase  | sequentially open  | progress     |
 * | Admin                         | all open           | progress     |
 *
 * ## Two sources for one list
 *
 * The module list is built from whichever endpoint the viewer is allowed to
 * call, and they return different things:
 *
 *   - No access → `/outline`, which is public but carries titles only.
 *   - Access    → `/progress`, which carries the same titles plus completion.
 *
 * Exactly one of the two is enabled, keyed off `access.isResolved` so neither
 * fires before we know which is correct. Both are then mapped into
 * `ModuleListItem`, which is why `<ModuleList>` needs no idea who's viewing.
 *
 * ## Why the whole page waits on `isResolved`
 *
 * Session state arrives after first paint, so for a moment every visitor looks
 * signed out. Rendering on that would show a paying student the price and a
 * locked syllabus, then swap it — which reads as a bug. The page shows a
 * spinner until the question is actually settled.
 */
export default function CoursePageView({ slug }: { slug: string }) {
  /**
   * The URL carries a slug, but every other endpoint on this page is keyed by
   * uuid. Rather than teach four routes to resolve slugs, this one lookup
   * exchanges the slug for the course — and everything downstream uses
   * `courseId` from the result.
   *
   * `useCourse` accepts either form, so a link that still uses a uuid (the
   * admin screens do) lands here and works unchanged.
   *
   * Every hook below takes `string | undefined` and stays idle while it is
   * undefined, so nothing fires before the id is known.
   */
  const course = useCourse(slug);
  const courseId = course.data?.id;

  const access = useCourseAccess(courseId, course.data?.owner_id);
  const categories = useCategoryOptions();

  // Exactly one of these two runs — see the note above.
  const outline = useCourseOutline(courseId, {
    enabled: access.isResolved && !access.canOpenModules,
  });
  const progress = useCourseProgress(courseId, {
    enabled: access.isResolved && access.canOpenModules,
  });

  /**
   * The certificate for this course, once it exists.
   *
   * Only asked for after the course reports itself finished, so the ordinary
   * visitor and the mid-course student never pay for it. Staff are excluded:
   * they bypass the sequence, so `course_completed` says nothing about them.
   */
  const certificates = useCertificates(
    { courseId: courseId ?? '', pageSize: 1 },
    {
      enabled:
        FEATURES.certificates &&
        Boolean(courseId) &&
        access.isResolved &&
        !access.isStaff &&
        progress.data?.course_completed === true,
    },
  );
  const certificate = certificates.data?.data[0];

  const modules: ModuleListItem[] = React.useMemo(() => {
    if (access.canOpenModules && progress.data) {
      const unlocked = unlockedModuleIds(progress.data.modules, {
        bypassSequence: access.bypassSequence,
      });

      return progress.data.modules.map((module) => ({
        id: module.module_id,
        title: module.title,
        order: module.order,
        completed: module.completed,
        unlocked: unlocked.has(module.module_id),
      }));
    }

    return (outline.data ?? []).map((module) => ({
      id: module.id,
      title: module.title,
      order: module.order,
      completed: false,
      unlocked: false,
    }));
  }, [access.canOpenModules, access.bypassSequence, progress.data, outline.data]);

  /**
   * Loading/error status of whichever list query is actually running, paired
   * with the already-normalised modules. Composing this by hand — rather than
   * handing `<QueryState>` one of the two raw queries — is what lets the list
   * render from a single typed shape regardless of where the data came from.
   *
   * It stays pending until access is known, so the list can't briefly render
   * as "empty" before the right query has even been enabled.
   */
  const modulesQuery = access.canOpenModules ? progress : outline;
  const modulesState = {
    data: modules,
    isPending: !access.isResolved || modulesQuery.isPending,
    isError: modulesQuery.isError,
    error: modulesQuery.error,
    refetch: modulesQuery.refetch,
  };

  if (course.isError && isStatus(course.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState
            title="Obuka nije pronađena"
            description="Obuka ne postoji ili trenutno nije objavljena."
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState query={course} errorTitle="Obuku nije moguće učitati">
        {(courseData) => {
          const thumbnail = courseThumbnailUrl(courseData.thumbnail_path);
          const categoryName = courseData.category_id
            ? categories.names.get(courseData.category_id)
            : undefined;

          return (
            <Stack spacing={3}>
              {access.isStaff ? (
                <Alert
                  severity="info"
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`/admin/courses/${courseData.id}/edit`}
                        size="small"
                        color="inherit"
                        startIcon={<EditOutlinedIcon />}
                      >
                        Izmijeni
                      </Button>
                      <Button
                        href={`/admin/courses/${courseData.id}/modules`}
                        size="small"
                        color="inherit"
                        startIcon={<ViewModuleOutlinedIcon />}
                      >
                        Moduli
                      </Button>
                    </Stack>
                  }
                >
                  {access.isAdmin
                    ? 'Gledate javnu stranicu obuke kao administrator — svi moduli su vam otključani.'
                    : 'Gledate javnu stranicu svoje obuke — kao predavaču, svi moduli su vam otključani.'}
                </Alert>
              ) : null}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Stack spacing={3}>
                    {/*
                      The thumbnail used to be a full-width 16:9 block above the
                      title — on a laptop that is most of the fold, so a visitor
                      landed on a decorative image and had to scroll to find out
                      what the course actually was.

                      It is now a fixed-size thumbnail beside the heading: the
                      same information, but the title leads and the description
                      is visible without scrolling. It stays full-width on
                      mobile, where a side-by-side split would leave both halves
                      too narrow to read.
                    */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 2, sm: 3 }}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          flexShrink: 0,
                          width: { xs: '100%', sm: 220 },
                          aspectRatio: '16 / 9',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: 1,
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'text.disabled',
                        }}
                      >
                        {thumbnail ? (
                          // Above the fold, so preloaded rather than lazy. Empty
                          // alt: the course name is the heading beside it.
                          <Image
                            src={thumbnail}
                            alt=""
                            fill
                            preload
                            sizes="(max-width: 600px) 100vw, 220px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageOutlinedIcon sx={{ fontSize: 40 }} />
                        )}
                      </Box>

                      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                        {categoryName ? (
                          <Box>
                            <Chip label={categoryName} size="small" variant="outlined" />
                          </Box>
                        ) : null}

                        <Typography variant="h1" component="h1">
                          {courseData.name}
                        </Typography>

                        {courseData.description ? (
                          <Typography
                            variant="body1"
                            color="text.secondary"
                            // Preserve the paragraph breaks the admin typed into
                            // the textarea; the column is already width-limited.
                            sx={{ whiteSpace: 'pre-line' }}
                          >
                            {courseData.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>

                    <ContentCard
                      title="Sadržaj obuke"
                      description={
                        access.canOpenModules
                          ? 'Moduli se otključavaju redom, kako ih završavaš.'
                          : 'Pregled modula. Sadržaj postaje dostupan nakon odobrenog pristupa.'
                      }
                      disablePadding
                    >
                      <QueryState
                        query={modulesState}
                        errorTitle="Module nije moguće učitati"
                        loading={<LoadingState minHeight={160} />}
                        isEmpty={(items) => items.length === 0}
                        empty={
                          <EmptyState
                            title="Obuka još nema module"
                            description="Sadržaj se uskoro dodaje."
                          />
                        }
                      >
                        {(items) => (
                          <ModuleList
                            modules={items}
                            // Module URLs sit under the course's public URL, so
                            // they are addressed by slug too.
                            courseSlug={courseData.slug}
                            lockedHint={
                              access.canOpenModules
                                ? 'Završi prethodni modul da otključaš ovaj.'
                                : 'Potreban je odobren pristup obuci.'
                            }
                          />
                        )}
                      </QueryState>
                    </ContentCard>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  {/* Until access is known, neither panel is safe to show. */}
                  {!access.isResolved ? (
                    <ContentCard>
                      <LoadingState minHeight={160} label="Provjera pristupa…" />
                    </ContentCard>
                  ) : access.canOpenModules ? (
                    <CourseProgressSummary
                      completedCount={progress.data?.completed_count ?? 0}
                      moduleCount={progress.data?.module_count ?? 0}
                      courseCompleted={progress.data?.course_completed ?? false}
                      certificateReadableId={certificate?.readable_id}
                    />
                  ) : (
                    <CoursePurchasePanel
                      courseId={courseData.id}
                      courseName={courseData.name}
                      price={courseData.price}
                      purchaseState={access.purchaseState}
                      isAuthenticated={access.isAuthenticated}
                      pendingPurchase={access.pendingPurchase}
                    />
                  )}
                </Grid>
              </Grid>
            </Stack>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
