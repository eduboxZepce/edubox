import { z } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import type { CreateTaskRequest, Task, UpdateTaskRequest } from './tasks.schema';

/**
 * The task form's schema.
 *
 * Same pattern as the other form schemas — plain `zod` (never
 * `@/lib/openapi/zod`, which drags zod-to-openapi into the browser bundle),
 * Serbian messages, and mappers annotated with the API request types so the
 * form and the contract cannot drift.
 *
 * A task is a single block of text. Attachments are **not** fields here: a file
 * is uploaded the moment it is chosen, not when the form is submitted — see
 * `<TaskFiles>`, which is the same split `<ModuleMaterials>` uses.
 */
export const taskFormSchema = z.object({
  text: z
    .string({ error: 'Tekst zadatka je obavezan.' })
    .trim()
    .min(1, 'Tekst zadatka je obavezan.')
    .max(10000, 'Tekst može imati najviše 10000 znakova.'),
});

export type TaskFormValues = z.output<typeof taskFormSchema>;
export type TaskFormInput = z.input<typeof taskFormSchema>;

/** A blank task form. */
export const emptyTaskFormValues: DefaultValues<TaskFormInput> = {
  text: '',
};

/** Loads an existing task into the form. */
export function taskToFormValues(task: Task): TaskFormInput {
  return { text: task.text };
}

/**
 * Form values → `POST /api/admin/tasks` body.
 *
 * `module_id` is not a form field — it comes from the URL, because a task only
 * ever exists inside one module. Passing it as an argument rather than hiding it
 * in the form keeps that relationship visible, the same way
 * `toCreateModulePayload` takes its `courseId`.
 */
export function toCreateTaskPayload(values: TaskFormValues, moduleId: string): CreateTaskRequest {
  return { module_id: moduleId, text: values.text };
}

/** Form values → `PATCH /api/admin/tasks/:id` body. */
export function toUpdateTaskPayload(values: TaskFormValues): UpdateTaskRequest {
  return { text: values.text };
}
