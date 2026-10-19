'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import QueryState from '@/components/feedback/QueryState';
import ModuleForm from '@/components/modules/ModuleForm';
import { useAdminCourse } from '@/hooks/useCourses';
import { useCourseModules, useCreateModule } from '@/hooks/useModules';
import { toCreateModulePayload, type ModuleFormValues } from '@/lib/schemas/module-form.schema';
import { toast } from '@/store/useToastStore';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CREATE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * There is no materials section here, and there cannot be: a module file is
 * stored at `{course_id}/{module_id}/…`, and the module id does not exist until
 * the create call returns. Files are added from the edit page instead — see
 * `<ModuleMaterials>`. One TODO remains, marked below.
 *
 * Compare against `src/app/(admin)/admin/courses/new/page.tsx`, which is the
 * finished reference for a create page.
 *
 * ## The shape of a create page
 *
 * The page owns the *flow*; `<ModuleForm>` owns the fields. The submit handler
 * has **no try/catch** — `<Form>` catches whatever it throws, shows it inline
 * and as a toast, and runs the submit overlay. Adding a try/catch here would
 * swallow the error and leave the user staring at a form that did nothing.
 *
 * ## Why `order` is computed, not typed
 *
 * A new module goes at the end. Making the user work out the next free number
 * invites duplicates and off-by-ones, so the page reads the existing modules
 * and derives it. The field is still visible and editable — the value is a
 * sensible default, not a lock.
 *
 * Note this is why the page waits for `modules` before rendering the form:
 * `defaultValues` is read once at mount, so the computed `order` has to be
 * known *before* `<ModuleForm>` appears. Rendering it beside the `<QueryState>`
 * instead of inside would give every module `order: 0`.
 */
export default function NewModulePage(props: PageProps<'/admin/courses/[id]/modules/new'>) {
  const { id: courseId } = React.use(props.params);

  const router = useRouter();
  const course = useAdminCourse(courseId);
  const modules = useCourseModules(courseId);
  const createModule = useCreateModule();

  async function handleSubmit(values: ModuleFormValues) {
    await createModule.mutateAsync(toCreateModulePayload(values, courseId));

    toast.success(`Modul „${values.title}” je kreiran.`);

    /*
     * TODO(intern) #1 — where to go next.
     *
     * Back to the module list is the safe default and is what this does. But
     * think about the real workflow: someone adding a course usually adds
     * several modules in a row. A "Sačuvaj i dodaj još jedan" secondary action
     * (see `secondaryActions` on `<FormActions>`) that resets the form instead
     * of navigating would save a lot of clicking. Your call — if you add it,
     * remember the form must be reset via `form.reset()`, and `order` has to be
     * recomputed for the next one.
     */
    router.push(`/admin/courses/${courseId}/modules`);
  }

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[
          { label: 'Obuke', href: '/admin/courses' },
          { label: course.data?.name ?? 'Obuka', href: `/admin/courses/${courseId}/edit` },
          { label: 'Moduli', href: `/admin/courses/${courseId}/modules` },
          { label: 'Novi modul' },
        ]}
        title="Novi modul"
        description="Modul se dodaje na kraj obuke. Materijale i redoslijed uređujete nakon kreiranja."
      />

      {/*
       * The form renders inside the QueryState, not beside it — see the note
       * about `defaultValues` at the top of this file.
       */}
      <QueryState query={modules} errorTitle="Postojeće module nije moguće učitati">
        {(page) => {
          // Next free position: one past the highest existing `order`.
          const nextOrder = page.data.reduce((max, m) => Math.max(max, m.order + 1), 0);

          return (
            <ModuleForm
              defaultValues={{ title: '', description: '', video_url: '', order: nextOrder }}
              onSubmit={handleSubmit}
              submitLabel="Kreiraj modul"
              pendingLabel="Kreiranje modula…"
              cancelHref={`/admin/courses/${courseId}/modules`}
            />
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
