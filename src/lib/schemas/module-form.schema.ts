import { z } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import type { CreateModuleRequest, Module, UpdateModuleRequest } from './modules.schema';
import { isValidYouTubeUrl } from '@/lib/youtube';

/**
 * The module form's schema.
 *
 * Written out in full deliberately: it is the second worked example of the
 * form-schema pattern (`course-form.schema.ts` is the first), so read the two
 * side by side before writing a third. The rules they share:
 *
 *   1. Plain `zod`, never `@/lib/openapi/zod` — the latter drags
 *      zod-to-openapi into the browser bundle.
 *   2. Messages are in Serbian, because a person reads them.
 *   3. A mapper annotated `(values): CreateXRequest` is what keeps the form and
 *      the API contract from drifting; if the endpoint changes, it stops
 *      compiling.
 */
export const moduleFormSchema = z.object({
  title: z
    .string({ error: 'Naslov je obavezan.' })
    .trim()
    .min(1, 'Naslov je obavezan.')
    .max(200, 'Naslov može imati najviše 200 znakova.'),

  description: z.string().trim().max(5000, 'Opis može imati najviše 5000 znakova.').default(''),

  /**
   * Optional, but a YouTube link when present — the same parser the API and
   * the player use (`@/lib/youtube`), so the form cannot accept a link the
   * server would reject. An untouched input yields `''`, which means "no video".
   */
  video_url: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidYouTubeUrl(value), {
      error: 'Link nije ispravan YouTube link.',
    })
    .default(''),

  /**
   * Position within the course, 0-based.
   *
   * This is what drives the student's sequential unlock, so it is not cosmetic.
   * The create page computes the next free value rather than asking the user
   * to guess it — see the note there.
   */
  order: z
    .number({ error: 'Redni broj je obavezan.' })
    .int('Redni broj mora biti cijeli broj.')
    .min(0, 'Redni broj ne može biti negativan.'),
});

export type ModuleFormValues = z.output<typeof moduleFormSchema>;
export type ModuleFormInput = z.input<typeof moduleFormSchema>;

/** A blank module form. `order` is supplied by the create page. */
export const emptyModuleFormValues: DefaultValues<ModuleFormInput> = {
  title: '',
  description: '',
  video_url: '',
};

/** Loads an existing module into the form, for the edit page. */
export function moduleToFormValues(module: Module): ModuleFormInput {
  return {
    title: module.title,
    description: module.description ?? '',
    video_url: module.video_url ?? '',
    order: module.order,
  };
}

/**
 * Form values → `POST /api/admin/modules` body.
 *
 * `course_id` is not a form field — it comes from the URL, because a module is
 * always created inside a course. Passing it as an argument rather than hiding
 * it in the form is what keeps that relationship obvious.
 *
 * Empty strings become `undefined` so the columns stay NULL rather than storing
 * a meaningless empty value.
 */
export function toCreateModulePayload(
  values: ModuleFormValues,
  courseId: string,
): CreateModuleRequest {
  return {
    course_id: courseId,
    title: values.title,
    description: values.description || undefined,
    video_url: values.video_url || undefined,
    order: values.order,
  };
}

/**
 * Form values → `PATCH /api/admin/modules/:id` body.
 *
 * An emptied video field sends `null`, which removes the video. `undefined`
 * would be dropped from the JSON and leave the old link in place.
 */
export function toUpdateModulePayload(values: ModuleFormValues): UpdateModuleRequest {
  return {
    title: values.title,
    description: values.description || undefined,
    video_url: values.video_url || null,
    order: values.order,
  };
}
