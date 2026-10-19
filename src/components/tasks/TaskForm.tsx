'use client';

import ContentCard from '@/components/layout/ContentCard';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormTextField from '@/components/form/FormTextField';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  taskFormSchema,
  type TaskFormInput,
  type TaskFormValues,
} from '@/lib/schemas/task-form.schema';

/**
 * The task's brief — one block of text, and that is the whole schema.
 *
 * Kept as a component rather than inlined on the page for the same reason
 * `CourseForm` and `ModuleForm` are: the page owns `onSubmit`, because creating
 * a task and editing one are different calls, while the fields and their
 * validation live here. It also means the quiz form, when it arrives, has an
 * obvious sibling to match.
 *
 * `defaultValues` is read once at mount, so the page must render this only after
 * it knows whether a task exists — never beside that decision.
 */
export default function TaskForm({
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
  pendingLabel,
}: {
  defaultValues: Partial<TaskFormInput>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
  pendingLabel?: string;
}) {
  const form = useZodForm(taskFormSchema, { defaultValues });

  return (
    <Form form={form} onSubmit={onSubmit} pendingLabel={pendingLabel}>
      <ContentCard
        title="Tekst zadatka"
        description="Što student treba uraditi i što predaje kao rješenje."
      >
        <FormTextField
          name="text"
          label="Zadatak"
          placeholder="Napravite jednostavnu HTML stranicu sa naslovom, pasusom i slikom…"
          helperText="Student ovo vidi na stranici modula. Priloge dodajete ispod."
          multiline
          rows={10}
          required
        />
      </ContentCard>

      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} />
    </Form>
  );
}
