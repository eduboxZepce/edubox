import { z } from 'zod';
import { imageFileSchema } from '@/lib/forms/fileSchema';
import { SLUG_MAX_LENGTH, SLUG_MESSAGE, SLUG_PATTERN } from '@/lib/slug';
import type { BlogPostRecord, CreateBlogPostRequest, UpdateBlogPostRequest } from './blog.schema';

/**
 * The blog post form's schema. Separate from `createBlogPostSchema` for the
 * usual two reasons (see `course-form.schema.ts`): the form holds a `File`
 * where the API holds a path, and its messages are for a person, in Bosnian.
 * Plain `zod`, because this runs in the browser.
 */
export const blogPostFormSchema = z
  .object({
    title: z
      .string({ error: 'Naslov je obavezan.' })
      .trim()
      .min(1, 'Naslov je obavezan.')
      .max(200, 'Naslov može imati najviše 200 znakova.'),

    excerpt: z
      .string({ error: 'Sažetak je obavezan.' })
      .trim()
      .min(1, 'Sažetak je obavezan.')
      .max(400, 'Sažetak može imati najviše 400 znakova.'),

    // Free text with suggestions; '' means "no category".
    category: z.string().trim().max(60, 'Tema može imati najviše 60 znakova.').default(''),

    published_at: z.iso.date('Unesite ispravan datum.'),

    /** Edit page only; '' regenerates it from the title, exactly like a course slug. */
    slug: z
      .string()
      .trim()
      .max(SLUG_MAX_LENGTH, `Adresa može imati najviše ${SLUG_MAX_LENGTH} znakova.`)
      .refine((value) => value === '' || SLUG_PATTERN.test(value), SLUG_MESSAGE)
      .default(''),

    /** A newly chosen cover — uploaded by the page, then saved as `image_path`. */
    image: imageFileSchema.nullable().default(null),

    /** Whether the post already has a cover. Not a field anyone types into. */
    has_current_image: z.boolean().default(false),

    /** Edit page: drop the current cover without choosing a new one. */
    remove_image: z.boolean().default(false),

    image_alt: z.string().trim().max(300, 'Opis slike može imati najviše 300 znakova.').default(''),

    content: z.string().default(''),
  })
  // A cover that will exist after saving needs alt text — the same rule the
  // database enforces, caught here so it reads as a field error.
  .refine(
    (values) =>
      !(values.image || (values.has_current_image && !values.remove_image)) ||
      values.image_alt !== '',
    { message: 'Opišite sliku — za čitače ekrana i pretraživače.', path: ['image_alt'] },
  );

export type BlogPostFormValues = z.output<typeof blogPostFormSchema>;
export type BlogPostFormInput = z.input<typeof blogPostFormSchema>;

/** Today as `yyyy-mm-dd`, in local time — `toISOString()` would be UTC and can be yesterday. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyBlogPostFormValues(): BlogPostFormInput {
  return {
    title: '',
    excerpt: '',
    category: '',
    published_at: today(),
    slug: '',
    image: null,
    has_current_image: false,
    remove_image: false,
    image_alt: '',
    content: '',
  };
}

export function blogPostToFormValues(post: BlogPostRecord): BlogPostFormInput {
  return {
    title: post.title,
    excerpt: post.excerpt,
    category: post.category ?? '',
    published_at: post.published_at,
    slug: post.slug,
    image: null,
    has_current_image: Boolean(post.image_path),
    remove_image: false,
    image_alt: post.image_alt ?? '',
    content: post.content,
  };
}

/**
 * Form values → `POST /api/admin/blog-posts`. `imagePath` is the upload's
 * result, when a cover was chosen; the page uploads before it creates.
 */
export function toCreateBlogPostPayload(
  values: BlogPostFormValues,
  id: string,
  imagePath: string | null,
): CreateBlogPostRequest {
  return {
    id,
    title: values.title,
    excerpt: values.excerpt,
    category: values.category || null,
    published_at: values.published_at,
    image_path: imagePath,
    image_alt: imagePath ? values.image_alt : null,
    content: values.content,
  };
}

/**
 * Form values → `PATCH /api/admin/blog-posts/:id`.
 *
 * The image pair is sent only when it changes: a new upload replaces it,
 * "remove" clears it, and otherwise only the alt text may have been edited.
 */
export function toUpdateBlogPostPayload(
  values: BlogPostFormValues,
  imagePath: string | null,
): UpdateBlogPostRequest {
  const image = imagePath
    ? { image_path: imagePath, image_alt: values.image_alt }
    : values.remove_image
      ? { image_path: null, image_alt: null }
      : values.has_current_image
        ? { image_alt: values.image_alt }
        : {};

  return {
    title: values.title,
    excerpt: values.excerpt,
    category: values.category || null,
    published_at: values.published_at,
    slug: values.slug,
    content: values.content,
    ...image,
  };
}
