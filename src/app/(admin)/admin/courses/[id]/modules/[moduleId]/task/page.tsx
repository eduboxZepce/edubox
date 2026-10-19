'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadingState from '@/components/feedback/LoadingState';
import TaskForm from '@/components/tasks/TaskForm';
import TaskFiles from '@/components/tasks/TaskFiles';
import TaskDeleteSection from '@/components/tasks/TaskDeleteSection';
import { useAdminCourse } from '@/hooks/useCourses';
import { useCourseModules } from '@/hooks/useModules';
import { useCreateTask, useModuleTask, useUpdateTask } from '@/hooks/useTasks';
import { isStatus } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import {
  emptyTaskFormValues,
  taskToFormValues,
  toCreateTaskPayload,
  toUpdateTaskPayload,
  type TaskFormValues,
} from '@/lib/schemas/task-form.schema';
import type { ModuleWithFiles } from '@/lib/schemas/modules.schema';

/**
 * The task belonging to one module — create it, edit it, delete it.
 *
 * ## One screen, not two
 *
 * A module has **at most one** task: `tasks.module_id` is `unique` (migration
 * 0008), so there is nothing to list and no id to put in the URL. The route is
 * `/admin/courses/{id}/modules/{moduleId}/task`, and whether that page creates
 * or edits is decided by what the server returns — not by a separate `/new`
 * route the admin has to pick between.
 *
 * ## "No task yet" arrives as a 404
 *
 * `GET /api/modules/:moduleId/task` 404s when the module has no task, which is
 * the correct answer for a sub-resource that does not exist — and it is
 * distinguishable from 403 ("not your course"), which is why the endpoint was
 * left that way. This page treats 404 as *the create case* and lets every other
 * error surface normally. 4xx is not retried (see `queryClient.ts`), so that
 * resolves in one request.
 */
export default function ModuleTaskPage(
  props: PageProps<'/admin/courses/[id]/modules/[moduleId]/task'>,
) {
  const { id: courseId, moduleId } = React.use(props.params);

  const course = useAdminCourse(courseId);
  const modules = useCourseModules(courseId);

  return (
    <PageContainer maxWidth="form">
      <QueryState query={modules} errorTitle="Modul nije moguće učitati">
        {(page) => {
          // Not `module` — ESLint rejects that identifier
          // (@next/next/no-assign-module-variable).
          const currentModule = page.data.find((m) => m.id === moduleId);

          // Covers both "no such module" and "belongs to a different course".
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
            <ModuleTaskScreen
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
 * Split out so the form mounts only once we know whether a task exists —
 * `defaultValues` is read once, so a form rendered before that decision would
 * start blank and stay blank on an existing task.
 */
function ModuleTaskScreen({
  courseId,
  courseName,
  currentModule,
}: {
  courseId: string;
  courseName: string | undefined;
  currentModule: ModuleWithFiles;
}) {
  const task = useModuleTask(currentModule.id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // A 404 here means "this module has no task yet", not a failure.
  const missing = task.isError && isStatus(task.error, 404);

  const backHref = `/admin/courses/${courseId}/modules/${currentModule.id}/edit`;

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: 'Obuke', href: '/admin/courses' },
        { label: courseName ?? 'Obuka', href: `/admin/courses/${courseId}/edit` },
        { label: 'Moduli', href: `/admin/courses/${courseId}/modules` },
        { label: currentModule.title, href: backHref },
        { label: 'Zadatak' },
      ]}
      title="Zadatak"
      description={`Zadatak za modul „${currentModule.title}”. Modul može imati najviše jedan.`}
    />
  );

  if (task.isPending) {
    return (
      <>
        {header}
        <ContentCard>
          <LoadingState minHeight={200} />
        </ContentCard>
      </>
    );
  }

  if (task.isError && !missing) {
    return (
      <>
        {header}
        <ErrorState
          error={task.error}
          title="Zadatak nije moguće učitati"
          onRetry={() => void task.refetch()}
        />
      </>
    );
  }

  const existing = missing ? null : task.data;

  // No try/catch: <Form> catches whatever this throws and surfaces it inline.
  async function handleSubmit(values: TaskFormValues) {
    if (existing) {
      await updateTask.mutateAsync({ id: existing.id, body: toUpdateTaskPayload(values) });
      toast.success('Zadatak je sačuvan.');
      return;
    }

    await createTask.mutateAsync(toCreateTaskPayload(values, currentModule.id));
    // Deliberately staying on the page: the attachments section only appears
    // once a task exists, and adding files is almost always the next step.
    toast.success('Zadatak je kreiran. Sada možete dodati priloge.');
  }

  return (
    <>
      {header}

      <TaskForm
        // Remount when the task appears, so the freshly created text becomes the
        // form's new baseline instead of the blank `defaultValues` it mounted with.
        key={existing?.id ?? 'new'}
        defaultValues={existing ? taskToFormValues(existing) : emptyTaskFormValues}
        onSubmit={handleSubmit}
        submitLabel={existing ? 'Sačuvaj zadatak' : 'Kreiraj zadatak'}
        pendingLabel={existing ? 'Čuvanje zadatka…' : 'Kreiranje zadatka…'}
        cancelHref={backHref}
      />

      {existing ? (
        <TaskFiles
          courseId={courseId}
          moduleId={currentModule.id}
          taskId={existing.id}
          files={existing.task_files}
        />
      ) : (
        <Alert severity="info">
          Priloge možete dodati nakon što sačuvate zadatak — datoteka se čuva pod zadatkom, koji do
          tada ne postoji.
        </Alert>
      )}

      {existing ? <TaskDeleteSection task={existing} /> : null}
    </>
  );
}
