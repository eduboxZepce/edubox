'use client';

import * as React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ModuleVideo from './ModuleVideo';
import PdfViewer from './PdfViewer';
import { useCourseModules } from '@/hooks/useModules';
import { useCompleteModule, useCourseProgress } from '@/hooks/useProgress';
import { useCertificates } from '@/hooks/useCertificates';
import { useModuleQuiz } from '@/hooks/useQuizzes';
import { useModuleTask } from '@/hooks/useTasks';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { unlockedModuleIds } from '@/lib/courseAccess';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import { FEATURES } from '@/lib/features';

/**
 * A student working through one module: video, materials, and the way on to its
 * quiz and task.
 *
 * ## The sequential unlock is enforced here, not just displayed
 *
 * The server component above checks that the viewer bought the course. It
 * cannot cheaply check *ordering*, because that needs the whole course's
 * progress. So this component applies `unlockedModuleIds` — completed modules
 * plus the first incomplete one — and refuses to render content for a module
 * that is still locked. Staff (an admin or the owning teacher) bypass it, same
 * rule as the course page.
 *
 * That is a UI guard on top of a backend one: `modules` RLS still requires an
 * approved purchase regardless, so the worst a bypass achieves is seeing a
 * module out of order, not seeing a course you have not bought.
 *
 * ## A module with no quiz and no task still has to be finishable
 *
 * `module_progress` used to have only two writers — the quiz attempt and the
 * submission approval — so a module with neither had nobody to write its row,
 * no row was ever created, and it stayed incomplete forever. Under sequential
 * unlock that strands the student there and locks everything after it. The
 * "Završi modul" card below is the third writer; the endpoint refuses any
 * module that *does* have a quiz or a task, so it can never be a way around
 * them.
 *
 * ## Quiz and task existence is discovered, not stored
 *
 * There is no `has_quiz` column — the endpoints simply 404 when a module has
 * neither. Both hooks run and a 404 is read as "none", which is why the two
 * cards below can be absent rather than empty. 4xx is not retried, so it costs
 * one request each.
 */
export default function ModuleViewer({
  courseId,
  courseName,
  courseSlug,
  courseOwnerId,
  moduleId,
}: {
  courseId: string;
  courseName: string;
  courseSlug: string;
  /** `courses.owner_id` — lets the owning teacher preview like an admin. */
  courseOwnerId: string | null;
  moduleId: string;
}) {
  const modules = useCourseModules(courseId);
  const progress = useCourseProgress(courseId);
  const access = useCourseAccess(courseId, courseOwnerId);

  const quiz = useModuleQuiz(moduleId);
  const task = useModuleTask(moduleId);

  const completeModule = useCompleteModule();

  /**
   * The certificate for this course, once there is one.
   *
   * Only asked for after `course_completed` flips, so the ordinary case costs
   * nothing. Staff are excluded: they bypass the sequence, so `course_completed`
   * means nothing for them and they have no certificate to link to.
   */
  const courseFinished = progress.data?.course_completed === true && !access.bypassSequence;
  const certificates = useCertificates(
    { courseId, pageSize: 1 },
    { enabled: FEATURES.certificates && courseFinished && access.isResolved && !access.isStaff },
  );
  const certificate = certificates.data?.data[0];

  const [materialIndex, setMaterialIndex] = React.useState(0);

  const quizExists = !(quiz.isError && isStatus(quiz.error, 404));
  const taskExists = !(task.isError && isStatus(task.error, 404));

  /*
   * What the student is *shown* is narrower than what exists: a quiz or task
   * whose feature flag is off is hidden as if it had never been built.
   *
   * The "Završi modul" card below still keys off existence, not visibility —
   * the endpoint refuses any module with a quiz or task, so offering the button
   * there would only produce an error. A module whose requirement is hidden is
   * therefore not finishable until the flag is back on; build demo courses
   * without them while a flag is off.
   */
  const hasQuiz = FEATURES.quizzes && quizExists;
  const hasTask = FEATURES.tasks && taskExists;

  return (
    <PageContainer>
      <QueryState query={modules} errorTitle="Modul nije moguće učitati">
        {(page) => {
          const currentModule = page.data.find((m) => m.id === moduleId);

          if (!currentModule) {
            return (
              <ContentCard>
                <EmptyState
                  title="Modul nije pronađen"
                  description="Modul ne postoji ili ne pripada ovoj obuci."
                />
              </ContentCard>
            );
          }

          const ordered = [...page.data].sort((a, b) => a.order - b.order);
          const index = ordered.findIndex((m) => m.id === moduleId);
          const previous = index > 0 ? ordered[index - 1] : undefined;
          const next = index < ordered.length - 1 ? ordered[index + 1] : undefined;

          const moduleProgress = progress.data?.modules.find((m) => m.module_id === moduleId);
          const isCompleted = moduleProgress?.completed ?? false;

          // Wait for progress before judging: assuming "locked" while it loads
          // would flash a lock at someone who has already finished the module.
          const unlocked = progress.data
            ? unlockedModuleIds(progress.data.modules, { bypassSequence: access.bypassSequence })
            : null;
          const isLocked = unlocked ? !unlocked.has(moduleId) : false;

          const header = (
            <PageHeader
              breadcrumbs={[
                // The catalogue crumb goes with the catalogue; the course is still a
                // reachable page for anyone who can open this one.
                ...(FEATURES.catalog ? [{ label: 'Obuke', href: '/courses' }] : []),
                { label: courseName, href: `/courses/${courseSlug}` },
                { label: currentModule.title },
              ]}
              title={currentModule.title}
              description={`Modul ${index + 1} od ${ordered.length}`}
              actions={
                isCompleted ? (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Završeno"
                    color="success"
                    variant="outlined"
                  />
                ) : undefined
              }
            />
          );

          if (isLocked) {
            return (
              <>
                {header}
                <ContentCard>
                  <EmptyState
                    title="Ovaj modul je još zaključan"
                    description="Završite prethodni modul da biste otključali ovaj."
                    icon={<LockOutlinedIcon />}
                    action={
                      <Button href={`/courses/${courseSlug}`} variant="contained">
                        Nazad na obuku
                      </Button>
                    }
                  />
                </ContentCard>
              </>
            );
          }

          const materials = currentModule.module_files;
          const material = materials[Math.min(materialIndex, materials.length - 1)];

          return (
            <>
              {header}

              {currentModule.video_url ? (
                <ContentCard title="Video lekcija" disablePadding>
                  <ModuleVideo url={currentModule.video_url} title={currentModule.title} />
                </ContentCard>
              ) : null}

              {currentModule.description ? (
                <ContentCard title="O modulu">
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {currentModule.description}
                  </Typography>
                </ContentCard>
              ) : null}

              {materials.length > 0 ? (
                <ContentCard
                  title="Materijali"
                  description="Materijali se čitaju ovdje, u aplikaciji."
                  disablePadding
                >
                  {/* Tabs only when there is a choice to make. */}
                  {materials.length > 1 ? (
                    <>
                      <Tabs
                        value={Math.min(materialIndex, materials.length - 1)}
                        onChange={(_event, value: number) => setMaterialIndex(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                      >
                        {materials.map((file) => (
                          <Tab
                            key={file.id}
                            label={file.file_name ?? file.file_path.split('/').pop()}
                          />
                        ))}
                      </Tabs>
                      <Divider />
                    </>
                  ) : null}

                  {material ? (
                    <PdfViewer
                      // Remount on switch: the viewer holds one document, and
                      // keying it is simpler than teaching it to swap.
                      key={material.id}
                      src={`/api/module-files/${material.id}/content`}
                      title={material.file_name ?? undefined}
                    />
                  ) : null}
                </ContentCard>
              ) : null}

              {hasQuiz || hasTask ? (
                <ContentCard title="Provjera znanja" disablePadding>
                  <Stack divider={<Divider />}>
                    {hasQuiz ? (
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{ px: 3, py: 2, alignItems: { sm: 'center' } }}
                      >
                        <QuizOutlinedIcon color="action" />
                        <Stack sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Kviz
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {moduleProgress?.quiz_done
                              ? 'Položen — kviz se ne radi ponovo.'
                              : 'Potrebno je položiti kviz da biste završili modul.'}
                          </Typography>
                        </Stack>
                        {/* A passed quiz is finished, not revisitable: the API
                            refuses a second attempt, so offering a button that
                            leads to a dead end would only mislead. */}
                        {moduleProgress?.quiz_done ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Položen"
                            color="success"
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                          />
                        ) : (
                          <Button
                            href={`/courses/${courseSlug}/modules/${moduleId}/quiz`}
                            variant="contained"
                            sx={{ flexShrink: 0 }}
                          >
                            Uradi kviz
                          </Button>
                        )}
                      </Stack>
                    ) : null}

                    {hasTask ? (
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{ px: 3, py: 2, alignItems: { sm: 'center' } }}
                      >
                        <AssignmentOutlinedIcon color="action" />
                        <Stack sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Zadatak
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {moduleProgress?.task_done
                              ? 'Prihvaćen.'
                              : 'Predajte rješenje na pregled.'}
                          </Typography>
                        </Stack>
                        <Button
                          href={`/courses/${courseSlug}/modules/${moduleId}/task`}
                          variant={moduleProgress?.task_done ? 'outlined' : 'contained'}
                          sx={{ flexShrink: 0 }}
                        >
                          {moduleProgress?.task_done ? 'Pogledaj zadatak' : 'Otvori zadatak'}
                        </Button>
                      </Stack>
                    ) : null}
                  </Stack>
                </ContentCard>
              ) : null}

              {!currentModule.video_url &&
              !currentModule.description &&
              materials.length === 0 &&
              !hasQuiz &&
              !hasTask ? (
                <ContentCard>
                  <EmptyState
                    title="Modul još nema sadržaj"
                    description="Predavač ga uskoro dodaje."
                  />
                </ContentCard>
              ) : null}

              {/*
                The moment the course finishes. Shown on whichever module was
                the last one completed, which is where the student actually is
                when it happens — the dashboard and the course page carry the
                same link for when they come back later.
              */}
              {courseFinished ? (
                <ContentCard>
                  <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 1 }}>
                    <WorkspacePremiumOutlinedIcon color="success" sx={{ fontSize: 48 }} />
                    <Stack spacing={0.5}>
                      <Typography variant="h6" component="p">
                        Čestitamo — završili ste obuku!
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Prošli ste sve module obuke „{courseName}”.
                        {FEATURES.certificates ? ' Certifikat je izdan na vaše ime.' : null}
                      </Typography>
                    </Stack>

                    {/* The button waits for the certificate rather than linking
                        optimistically: it is issued by the same request that
                        completed the module, so for a moment it exists in the
                        response but not yet in this query. */}
                    {!FEATURES.certificates ? null : certificate ? (
                      <Button
                        href={`/certificates/${certificate.readable_id}`}
                        variant="contained"
                        startIcon={<WorkspacePremiumOutlinedIcon />}
                      >
                        Pogledaj certifikat
                      </Button>
                    ) : (
                      <Button variant="contained" disabled>
                        Certifikat se izdaje…
                      </Button>
                    )}
                  </Stack>
                </ContentCard>
              ) : null}

              {/*
                Nothing to hand in, so the student says when they are done.
                Hidden from staff (`bypassSequence`): they are previewing, not
                studying, and marking it would write progress against their own
                account — and on a final module, issue them a certificate.

                Waits for `progress.data` rather than defaulting to "not done",
                which would flash a "Završi modul" button at someone who
                already has.
              */}
              {!quizExists && !taskExists && !access.bypassSequence && progress.data ? (
                <ContentCard
                  title="Završetak modula"
                  description={
                    isCompleted
                      ? 'Ovaj modul je završen.'
                      : 'Označite modul kao završen kada prođete kroz sadržaj.'
                  }
                >
                  {isCompleted ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Završeno"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<CheckCircleOutlinedIcon />}
                      disabled={completeModule.isPending}
                      onClick={() => {
                        completeModule.mutate(moduleId, {
                          onSuccess: (result) => {
                            toast.success(
                              result.data.certificate_issued && FEATURES.certificates
                                ? 'Modul je završen. Završili ste obuku — certifikat je izdan.'
                                : 'Modul je završen.',
                            );
                          },
                          onError: (error) => toast.error(errorMessage(error)),
                        });
                      }}
                    >
                      {completeModule.isPending ? 'Čuvanje…' : 'Završi modul'}
                    </Button>
                  )}
                </ContentCard>
              ) : null}

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                <Button
                  href={
                    previous
                      ? `/courses/${courseSlug}/modules/${previous.id}`
                      : `/courses/${courseSlug}`
                  }
                  startIcon={<ArrowBackIcon />}
                  color="inherit"
                >
                  {previous ? 'Prethodni modul' : 'Nazad na obuku'}
                </Button>

                {next ? (
                  <Button
                    href={`/courses/${courseSlug}/modules/${next.id}`}
                    endIcon={<ArrowForwardIcon />}
                    // Honest about the sequential rule: the next module only
                    // opens once this one is done, so don't invite the click.
                    disabled={!isCompleted && !access.bypassSequence}
                    variant="contained"
                  >
                    Sljedeći modul
                  </Button>
                ) : null}
              </Stack>
            </>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
