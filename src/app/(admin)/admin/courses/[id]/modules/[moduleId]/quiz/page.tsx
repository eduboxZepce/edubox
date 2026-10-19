'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadingState from '@/components/feedback/LoadingState';
import QuizForm from '@/components/quizzes/QuizForm';
import QuizDeleteSection from '@/components/quizzes/QuizDeleteSection';
import { useAdminCourse } from '@/hooks/useCourses';
import { useCourseModules } from '@/hooks/useModules';
import { useAdminModuleQuiz, useCreateQuiz, useUpdateQuiz } from '@/hooks/useQuizzes';
import { isStatus } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import {
  emptyQuizFormValues,
  quizToFormValues,
  toCreateQuizPayload,
  toUpdateQuizPayload,
  type QuizFormValues,
} from '@/lib/schemas/quiz-form.schema';
import type { ModuleWithFiles } from '@/lib/schemas/modules.schema';

/**
 * The quiz belonging to one module — create it, edit it, delete it.
 *
 * Follows the task screen exactly, because it is the same problem: `quizzes`
 * .module_id is `unique` (migration 0007), so there is at most one, nothing to
 * list, and no id worth putting in the URL. The route is
 * `/admin/courses/{id}/modules/{moduleId}/quiz`, and whether it creates or edits
 * is decided by what the server returns — 404 is the create case.
 *
 * ## Saving replaces the whole question set
 *
 * `PATCH /api/admin/quizzes/:id` deletes the existing questions and re-inserts
 * them, because this form has no stable ids to diff against. Two consequences
 * worth knowing:
 *
 *   - question and answer ids change on every save. Nothing here depends on
 *     them, but do not build anything that does;
 *   - editing a live quiz rewrites what in-progress students are looking at.
 *     Existing `module_progress` rows are untouched — scoring already happened —
 *     but a student mid-attempt will see the new questions on their next load.
 */
export default function ModuleQuizPage(
  props: PageProps<'/admin/courses/[id]/modules/[moduleId]/quiz'>,
) {
  const { id: courseId, moduleId } = React.use(props.params);

  const course = useAdminCourse(courseId);
  const modules = useCourseModules(courseId);

  return (
    <PageContainer maxWidth="form">
      <QueryState query={modules} errorTitle="Modul nije moguće učitati">
        {(page) => {
          // Not `module` — ESLint rejects that identifier.
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

          return (
            <ModuleQuizScreen
              courseId={courseId}
              courseName={course.data?.name}
              currentModule={currentModule}
            />
          );
        }}
      </QueryState>
    </PageContainer>
  );
}

/**
 * Split out so the form mounts only once we know whether a quiz exists —
 * `defaultValues` is read once, so mounting earlier would leave every field
 * blank on an existing quiz.
 */
function ModuleQuizScreen({
  courseId,
  courseName,
  currentModule,
}: {
  courseId: string;
  courseName: string | undefined;
  currentModule: ModuleWithFiles;
}) {
  const quiz = useAdminModuleQuiz(currentModule.id);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();

  // 404 means "this module has no quiz yet", not a failure.
  const missing = quiz.isError && isStatus(quiz.error, 404);

  const backHref = `/admin/courses/${courseId}/modules/${currentModule.id}/edit`;

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: 'Obuke', href: '/admin/courses' },
        { label: courseName ?? 'Obuka', href: `/admin/courses/${courseId}/edit` },
        { label: 'Moduli', href: `/admin/courses/${courseId}/modules` },
        { label: currentModule.title, href: backHref },
        { label: 'Kviz' },
      ]}
      title="Kviz"
      description={`Kviz za modul „${currentModule.title}”. Modul može imati najviše jedan.`}
    />
  );

  if (quiz.isPending) {
    return (
      <>
        {header}
        <ContentCard>
          <LoadingState minHeight={200} />
        </ContentCard>
      </>
    );
  }

  if (quiz.isError && !missing) {
    return (
      <>
        {header}
        <ErrorState
          error={quiz.error}
          title="Kviz nije moguće učitati"
          onRetry={() => void quiz.refetch()}
        />
      </>
    );
  }

  const existing = missing ? null : quiz.data;

  // No try/catch: <Form> catches whatever this throws and surfaces it inline.
  async function handleSubmit(values: QuizFormValues) {
    if (existing) {
      await updateQuiz.mutateAsync({ id: existing.id, body: toUpdateQuizPayload(values) });
      toast.success('Kviz je sačuvan.');
      return;
    }

    await createQuiz.mutateAsync(toCreateQuizPayload(values, currentModule.id));
    // Staying on the page: the author usually wants to see the saved quiz, and
    // the delete control only appears once it exists.
    toast.success('Kviz je kreiran.');
  }

  return (
    <>
      {header}

      <QuizForm
        // Remount when the quiz appears or its questions are replaced, so the
        // saved state becomes the form's new baseline. Question ids change on
        // every save, which is exactly what makes a stale baseline confusing.
        key={existing ? `${existing.id}-${existing.questions.length}` : 'new'}
        defaultValues={existing ? quizToFormValues(existing) : emptyQuizFormValues}
        onSubmit={handleSubmit}
        submitLabel={existing ? 'Sačuvaj kviz' : 'Kreiraj kviz'}
        pendingLabel={existing ? 'Čuvanje kviza…' : 'Kreiranje kviza…'}
        cancelHref={backHref}
      />

      {existing ? <QuizDeleteSection quizId={existing.id} /> : null}
    </>
  );
}
