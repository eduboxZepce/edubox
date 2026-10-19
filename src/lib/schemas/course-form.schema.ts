import { z } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import { imageFileSchema } from '@/lib/forms/fileSchema';
import { SLUG_MAX_LENGTH, SLUG_MESSAGE, SLUG_PATTERN } from '@/lib/slug';
import type { Course, CreateCourseRequest, UpdateCourseRequest } from './courses.schema';

/**
 * The course form's own schema — the reference example for every form schema
 * that follows.
 *
 * ## Why this is separate from `createCourseSchema`
 *
 * Two reasons, and both generalise to the next form:
 *
 * 1. **A form has fields the API doesn't.** The user picks a `File`; the API
 *    stores a `thumbnail_path` string. The file only becomes a path after it's
 *    uploaded, which can't happen until the course exists and has a folder.
 * 2. **Messages.** API validation answers another program and can stay in
 *    English; form validation answers the person typing, in their language.
 *
 * ## Why plain `zod` and not `@/lib/openapi/zod`
 *
 * This module is imported by a client component, and `@/lib/openapi/zod` pulls
 * `@asteasolutions/zod-to-openapi` in with it — a server-side documentation
 * concern with no business in the browser bundle.
 *
 * ## What stops the two drifting apart
 *
 * `toCreateCoursePayload` below is annotated as returning `CreateCourseRequest`.
 * If a field is added, renamed or retyped in the API schema, that function stops
 * compiling — so the contract is checked by the compiler rather than by memory.
 */
export const courseFormSchema = z.object({
  name: z
    .string({ error: 'Naziv je obavezan.' })
    .trim()
    .min(1, 'Naziv je obavezan.')
    .max(200, 'Naziv može imati najviše 200 znakova.'),

  description: z
    .string()
    .trim()
    .max(5000, 'Opis može imati najviše 5000 znakova.')
    // The textarea always yields a string, so the field is required at form
    // level and merely empty — `toCreateCoursePayload` turns '' into undefined.
    .default(''),

  category_id: z.uuid('Izaberite ispravnu kategoriju.').nullable().default(null),

  price: z
    .number({ error: 'Unesite cijenu. Za besplatnu obuku unesite 0.' })
    .nonnegative('Cijena ne može biti negativna.')
    .max(10_000_000, 'Cijena je nerealno visoka.'),

  published: z.boolean().default(false),

  /**
   * The public URL segment. Only shown on the edit page — on create the
   * database derives it from the name (migration 0021).
   *
   * Empty is valid and meaningful: it tells the trigger to regenerate the slug
   * from the current name, which is the supported way to fix one after a
   * rename. `.refine` rather than `.regex` so that empty passes without a
   * second alternative branch.
   */
  slug: z
    .string()
    .trim()
    .max(SLUG_MAX_LENGTH, `Adresa može imati najviše ${SLUG_MAX_LENGTH} znakova.`)
    .refine((value) => value === '' || SLUG_PATTERN.test(value), SLUG_MESSAGE)
    .default(''),

  /** Not sent with the create/update body — uploaded separately, see the page. */
  thumbnail: imageFileSchema.nullable().default(null),
});

export type CourseFormValues = z.output<typeof courseFormSchema>;
/** What the fields hold while typing, before parsing fills in defaults. */
export type CourseFormInput = z.input<typeof courseFormSchema>;

/**
 * A blank course form.
 *
 * Typed as `DefaultValues<…>` (a deep-partial) rather than `CourseFormInput`,
 * which is what lets `price` be omitted entirely: the box then starts empty and
 * the admin makes a deliberate choice, including typing 0 for a free course.
 * Seeding it with 0 would let a paid course ship at no charge by oversight.
 */
export const emptyCourseFormValues: DefaultValues<CourseFormInput> = {
  name: '',
  description: '',
  category_id: null,
  published: false,
  slug: '',
  thumbnail: null,
};

/** Loads an existing course into the same form, for the edit page. */
export function courseToFormValues(course: Course): CourseFormInput {
  return {
    name: course.name,
    description: course.description ?? '',
    category_id: course.category_id,
    price: course.price,
    published: course.published,
    slug: course.slug,
    thumbnail: null,
  };
}

/**
 * Form values → `POST /api/admin/courses` body.
 *
 * `thumbnail` is dropped deliberately: the file is uploaded after the course
 * is created, and `thumbnail_path` is saved by the follow-up update.
 */
export function toCreateCoursePayload(values: CourseFormValues): CreateCourseRequest {
  return {
    name: values.name,
    // The column is nullable and the API treats an absent key as "no value";
    // an empty string would be stored as a meaningless empty description.
    description: values.description || undefined,
    category_id: values.category_id,
    price: values.price,
    published: values.published,
  };
}

/**
 * Form values → `PATCH /api/admin/courses/:id` body.
 *
 * Everything the create payload sends, plus `slug`, which only the edit form
 * offers. `''` is passed through rather than dropped — it is the instruction to
 * regenerate the slug from the name, not an absent value.
 */
export function toUpdateCoursePayload(values: CourseFormValues): UpdateCourseRequest {
  return {
    ...toCreateCoursePayload(values),
    slug: values.slug,
  };
}
