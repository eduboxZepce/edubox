import { z } from '@/lib/openapi/zod';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@/lib/slug';
import { auditFields, paginatedResponse, paginationQuerySchema, uuidSchema } from './common.schema';

/**
 * Blog posts (migration 0035), written by admins at `/admin/blog`.
 *
 * The public pages do not go through this API — they read on the server
 * (`src/lib/server/blog.ts`) so the article is in the initial HTML. These
 * routes exist for the admin screens.
 */

const isoDate = z.iso.date().openapi({ example: '2026-08-27' });

export const blogPostSchema = z
  .object({
    id: uuidSchema,
    slug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    category: z.string().nullable(),
    published_at: isoDate,
    image_path: z.string().nullable().openapi({
      description:
        'Object path in `blog-images`, or a root-relative path under `public/` for posts carried over from the repo.',
    }),
    image_alt: z.string().nullable(),
    content: z.string().openapi({ description: 'Markdown' }),
    ...auditFields,
  })
  .openapi('BlogPost');

/** The list omits `content` — the admin table never shows it, and it is the bulk of a row. */
export const blogPostSummarySchema = blogPostSchema
  .omit({ content: true })
  .openapi('BlogPostSummary');

export const listBlogPostsQuerySchema = paginationQuerySchema.openapi('ListBlogPostsQuery');

export const blogPostListResponseSchema =
  paginatedResponse(blogPostSummarySchema).openapi('BlogPostListResponse');

export const blogPostResponseSchema = z
  .object({ data: blogPostSchema })
  .openapi('BlogPostResponse');

/**
 * A missing image must be missing in both columns, and a present one must carry
 * alt text — the same rule as `blog_posts_image_alt_check`, checked here so the
 * caller gets a 400 that names the field instead of a constraint violation.
 */
const imageAltRequired = (value: { image_path?: string | null; image_alt?: string | null }) =>
  !value.image_path || Boolean(value.image_alt?.trim());

const imageAltIssue = {
  error: 'image_alt is required when image_path is set',
  path: ['image_alt'],
};

const blogPostFields = {
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().min(1).max(400),
  category: z.string().trim().max(60).nullable(),
  published_at: isoDate,
  image_path: z.string().trim().min(1).nullable(),
  image_alt: z.string().trim().max(300).nullable(),
  content: z.string().max(200_000),
  /**
   * `''` asks the database to derive the slug from the title (the
   * `blog_posts_set_slug` trigger). Anything else must already be a valid slug —
   * the database stores a supplied value verbatim.
   */
  slug: z
    .string()
    .trim()
    .max(SLUG_MAX_LENGTH)
    .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Not a valid slug'),
};

export const createBlogPostSchema = z
  .object({
    /**
     * Optional client-chosen id. The editor generates one up front so images
     * pasted into a brand-new post already have their `{post_id}/` folder.
     */
    id: uuidSchema.optional(),
    ...blogPostFields,
    category: blogPostFields.category.optional(),
    published_at: blogPostFields.published_at.optional(),
    image_path: blogPostFields.image_path.optional(),
    image_alt: blogPostFields.image_alt.optional(),
    content: blogPostFields.content.default(''),
  })
  // No `slug` on create: the database derives it from the title.
  .omit({ slug: true })
  .refine(imageAltRequired, imageAltIssue)
  .openapi('CreateBlogPostRequest');

/**
 * Every field optional; send only what changed — except that a new
 * `image_path` must arrive with its `image_alt`, since the two describe one
 * image. Sending `image_path: null` removes the cover.
 */
export const updateBlogPostSchema = z
  .object(blogPostFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No fields to update' })
  .refine(imageAltRequired, imageAltIssue)
  .openapi('UpdateBlogPostRequest');

export type BlogPostRecord = z.infer<typeof blogPostSchema>;
export type BlogPostSummary = z.infer<typeof blogPostSummarySchema>;
export type CreateBlogPostRequest = z.input<typeof createBlogPostSchema>;
export type UpdateBlogPostRequest = z.infer<typeof updateBlogPostSchema>;
