import { z } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from './categories.schema';

/**
 * The category form's schema — the smallest example of the form-schema pattern
 * in the codebase, and a good one to read first. The rules it follows are the
 * same ones `course-form.schema.ts` and `module-form.schema.ts` follow:
 *
 *   1. Plain `zod`, never `@/lib/openapi/zod` — the latter drags
 *      zod-to-openapi into the browser bundle.
 *   2. Messages are in Serbian, because a person reads them.
 *   3. A mapper annotated `(values): CreateXRequest` keeps the form and the API
 *      contract from drifting; if the endpoint changes, it stops compiling.
 *
 * One field, so create and edit share it — see `CategoryFormDialog`.
 */
export const categoryFormSchema = z.object({
  /**
   * `max(120)` mirrors `createCategorySchema` on the API side. `name` is also
   * `unique` in the database, but uniqueness can't be checked in the browser —
   * a duplicate comes back as a 409, which `<Form>` surfaces as an inline alert.
   */
  name: z
    .string({ error: 'Naziv je obavezan.' })
    .trim()
    .min(1, 'Naziv je obavezan.')
    .max(120, 'Naziv može imati najviše 120 znakova.'),
});

export type CategoryFormValues = z.output<typeof categoryFormSchema>;
export type CategoryFormInput = z.input<typeof categoryFormSchema>;

/** A blank category form. */
export const emptyCategoryFormValues: DefaultValues<CategoryFormInput> = {
  name: '',
};

/** Loads an existing category into the form, for the edit dialog. */
export function categoryToFormValues(category: Category): CategoryFormInput {
  return { name: category.name };
}

/** Form values → `POST /api/admin/categories` body. */
export function toCreateCategoryPayload(values: CategoryFormValues): CreateCategoryRequest {
  return { name: values.name };
}

/** Form values → `PATCH /api/admin/categories/:id` body. */
export function toUpdateCategoryPayload(values: CategoryFormValues): UpdateCategoryRequest {
  return { name: values.name };
}
