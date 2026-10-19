'use client';

import * as React from 'react';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import ModuleForm from '@/components/modules/ModuleForm';
import ModuleMaterials from '@/components/modules/ModuleMaterials';
import ModuleDeleteSection from '@/components/modules/ModuleDeleteSection';
import { useAdminCourse } from '@/hooks/useCourses';
import { useCourseModules, useUpdateModule } from '@/hooks/useModules';
import { moduleToFormValues, toUpdateModulePayload } from '@/lib/schemas/module-form.schema';
import type { ModuleFormValues } from '@/lib/schemas/module-form.schema';
import { toast } from '@/store/useToastStore';
import { FEATURES } from '@/lib/features';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EDIT MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Saving, materials, delete and the quiz/task entry points are all built.
 *
 * ## Read this first: there is no "get one module" endpoint
 *
 * The API exposes `GET /api/courses/:courseId/modules` (a list) and
 * `PATCH /api/admin/modules/:id` — but no `GET /api/admin/modules/:id`. So this
 * page fetches the course's modules and picks the one it wants out of the list.
 *
 * That is a deliberate trade, not an oversight: a course has a handful of
 * modules, the list is already cached by the modules page you navigated from,
 * and adding an endpoint costs a route, a schema entry and a hook. If module
 * counts ever grow, add `GET /api/admin/modules/:id` and swap the lookup
 * below — see how `useAdminPurchase` was added for exactly that reason.
 *
 * The consequence to keep in mind: "not found" here means *not in this
 * course's list*, which also covers "the id belongs to another course". Both
 * should render the same not-found state, and the code below does.
 *
 * ## The rule that will bite you
 *
 * `defaultValues` is read once at mount, so `<ModuleForm>` MUST stay inside the
 * `<QueryState>`. Move it out and the fields mount empty and never fill in.
 */
export default function EditModulePage(
  props: PageProps<'/admin/courses/[id]/modules/[moduleId]/edit'>,
) {
  const { id: courseId, moduleId } = React.use(props.params);

  const router = useRouter();
  const course = useAdminCourse(courseId);
  const modules = useCourseModules(courseId);
  const updateModule = useUpdateModule();

  async function handleSubmit(values: ModuleFormValues) {
    // No try/catch — <Form> surfaces whatever this throws.
    await updateModule.mutateAsync({ id: moduleId, body: toUpdateModulePayload(values) });

    toast.success('Modul je sačuvan.');
    router.push(`/admin/courses/${courseId}/modules`);
  }

  return (
    <PageContainer maxWidth="form">
      <QueryState query={modules} errorTitle="Modul nije moguće učitati">
        {(page) => {
          // Not named `module` — that shadows a Node global and ESLint rejects it
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
            <>
              <PageHeader
                breadcrumbs={[
                  { label: 'Obuke', href: '/admin/courses' },
                  {
                    label: course.data?.name ?? 'Obuka',
                    href: `/admin/courses/${courseId}/edit`,
                  },
                  { label: 'Moduli', href: `/admin/courses/${courseId}/modules` },
                  { label: currentModule.title },
                ]}
                title={currentModule.title}
                description="Izmjena modula."
                actions={
                  <Stack direction="row" spacing={1.5}>
                    {FEATURES.quizzes ? (
                      <Button
                        href={`/admin/courses/${courseId}/modules/${currentModule.id}/quiz`}
                        variant="outlined"
                        startIcon={<QuizOutlinedIcon />}
                      >
                        Kviz
                      </Button>
                    ) : null}
                    {FEATURES.tasks ? (
                      <Button
                        href={`/admin/courses/${courseId}/modules/${currentModule.id}/task`}
                        variant="outlined"
                        startIcon={<AssignmentOutlinedIcon />}
                      >
                        Zadatak
                      </Button>
                    ) : null}
                  </Stack>
                }
              />

              <ModuleForm
                defaultValues={moduleToFormValues(currentModule)}
                onSubmit={handleSubmit}
                submitLabel="Sačuvaj izmjene"
                pendingLabel="Čuvanje modula…"
                cancelHref={`/admin/courses/${courseId}/modules`}
              />

              <ModuleMaterials
                courseId={courseId}
                moduleId={currentModule.id}
                files={currentModule.module_files}
              />

              <ModuleDeleteSection currentModule={currentModule} courseId={courseId} />
            </>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
