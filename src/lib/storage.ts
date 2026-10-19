import { publicEnv } from '@/lib/env';

/**
 * Storage bucket names and the path conventions the RLS policies depend on.
 *
 * Migration `0013_storage_buckets_and_policies.sql` reads the first folder
 * segment of every object path to decide access — e.g. a `module-files` object
 * is readable only if the caller has an approved purchase for the course whose
 * id is that first segment. Uploading to the wrong shape doesn't error, it just
 * produces a file nobody can read, so always build paths with `storagePath()`.
 */
export const BUCKETS = {
  courseThumbnails: 'course-thumbnails',
  moduleFiles: 'module-files',
  taskFiles: 'task-files',
  taskMessageAttachments: 'task-message-attachments',
  newsletterImages: 'newsletter-images',
  blogImages: 'blog-images',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Buckets served straight from the CDN, with no signed URL needed. */
const PUBLIC_BUCKETS: readonly BucketName[] = [
  BUCKETS.courseThumbnails,
  /*
   * Public because a mail client fetches embedded images anonymously — there is
   * no session to authorise, and a signed URL would expire and break the
   * message for anyone reading it later. See migration 0033 for why that
   * disclosure is acceptable for this bucket and no other.
   */
  BUCKETS.newsletterImages,
  // Blog covers and inline images — public content read by anonymous visitors
  // and crawlers (migration 0035).
  BUCKETS.blogImages,
];

export const isPublicBucket = (bucket: BucketName) => PUBLIC_BUCKETS.includes(bucket);

/**
 * How many leading id folders each bucket's paths must carry, as enforced by
 * the RLS policies:
 *
 *   course-thumbnails         {course_id}/
 *   module-files              {course_id}/{module_id}/
 *   task-files                {course_id}/{module_id}/
 *   task-message-attachments  {submission_id}/
 *   blog-images               {post_id}/
 */
export const BUCKET_PATH_SEGMENTS: Record<BucketName, number> = {
  [BUCKETS.courseThumbnails]: 1,
  [BUCKETS.moduleFiles]: 2,
  [BUCKETS.taskFiles]: 2,
  [BUCKETS.taskMessageAttachments]: 1,
  // `{yyyy-mm}/` — a newsletter image belongs to no row, so there is no id to
  // key on; the month keeps the bucket browsable by hand.
  [BUCKETS.newsletterImages]: 1,
  // `{post_id}/` — cover and inline images share the post's folder, so
  // deleting the post can clear it.
  [BUCKETS.blogImages]: 1,
};

/**
 * Combining diacritical marks, which `normalize('NFD')` splits letters into —
 * removing them turns "Čačak" into "Cacak" rather than dropping the letter.
 */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Strips anything that would make an object path awkward to reference, while
 * keeping the extension intact. Supabase accepts more than this, but a
 * predictable ASCII path avoids encoding surprises in URLs.
 */
export function safeFileName(fileName: string): string {
  const normalised = fileName
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  // Prefix with a timestamp so re-uploading the same filename never silently
  // overwrites the previous object.
  return `${Date.now()}-${normalised}`;
}

/** Joins the owning ids and a filename into a bucket-correct object path. */
export function storagePath(folders: string[], fileName: string): string {
  return [...folders, safeFileName(fileName)].join('/');
}

/**
 * The name a human should see for a stored object.
 *
 * `safeFileName()` prefixes every upload with `Date.now()` so a re-upload never
 * overwrites the previous object. That prefix is storage bookkeeping and must
 * not reach the reader — a student who attached `resenje.pdf` should see
 * `resenje.pdf`, not `1756213847312-resenje.pdf`.
 *
 * Lives here, next to the function that adds the prefix, because the two are
 * one convention. Written inline once in `TaskWorkspace` it was `/^d+-/` — a
 * missing backslash, so it matched nothing and every attachment rendered with
 * its timestamp still on the front.
 */
export function displayFileName(path: string | null | undefined): string {
  if (!path) return '';
  const stored = path.split('/').pop() ?? '';
  return stored.replace(/^\d+-/, '');
}

/**
 * CDN URL for an object in a public bucket. Returns null for a missing path so
 * callers can fall back to a placeholder with a plain nullish check.
 */
export function publicUrl(bucket: BucketName, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/** Convenience wrapper for the one public bucket we render images from. */
export const courseThumbnailUrl = (path: string | null | undefined) =>
  publicUrl(BUCKETS.courseThumbnails, path);

const MB = 1024 * 1024;

/**
 * Default limit for working documents: task files and message attachments.
 *
 * Message attachments still travel through a route handler as multipart, and
 * Vercel caps a function's request body at 4.5 MB — so this cannot usefully
 * grow until that route moves to signed uploads too.
 */
export const MAX_UPLOAD_BYTES = 5 * MB;

/**
 * Stored size limit for images in the public buckets (thumbnails, blog,
 * newsletter). Low on purpose: the free plan has 1 GB of storage for
 * everything, and `compressImage()` resizes to `IMAGE_MAX_DIMENSION` before
 * upload, after which a photo is typically 100–300 KB.
 */
export const MAX_IMAGE_BYTES = 1 * MB;

/**
 * What the image picker accepts *before* compression. A phone photo is
 * routinely 5–15 MB; rejecting it would make the admin resize by hand
 * something the browser is about to resize anyway.
 */
export const MAX_IMAGE_SOURCE_BYTES = 25 * MB;

/**
 * Longest edge of an uploaded image, in pixels. The widest slot images fill is
 * the 800px blog article column, so 1600 covers it on a 2× screen; next/image
 * derives every smaller size from this.
 */
export const IMAGE_MAX_DIMENSION = 1600;

/**
 * Module materials. A 50–100 slide deck exported from PowerPoint is usually
 * 3–15 MB, and up to ~25 MB when it is mostly full-bleed photos. Above that the
 * export settings are the problem (see the hint in `<ModuleMaterials>`), not
 * the limit. Free-plan projects cap any single file at 50 MB regardless.
 */
export const MAX_MODULE_FILE_BYTES = 25 * MB;

/**
 * Per-bucket ceiling, checked by `/api/admin/uploads` before it signs an upload
 * and enforced on the actual bytes by the bucket's own `file_size_limit`
 * (migration 0036) — the browser uploads straight to storage, so the route
 * never sees the file.
 */
export const BUCKET_MAX_BYTES: Record<BucketName, number> = {
  [BUCKETS.courseThumbnails]: MAX_IMAGE_BYTES,
  [BUCKETS.moduleFiles]: MAX_MODULE_FILE_BYTES,
  [BUCKETS.taskFiles]: MAX_UPLOAD_BYTES,
  [BUCKETS.taskMessageAttachments]: MAX_UPLOAD_BYTES,
  [BUCKETS.newsletterImages]: MAX_IMAGE_BYTES,
  [BUCKETS.blogImages]: MAX_IMAGE_BYTES,
};

/** Buckets whose uploads go through `compressImage()` first. */
export const IMAGE_BUCKETS: readonly BucketName[] = [
  BUCKETS.courseThumbnails,
  BUCKETS.newsletterImages,
  BUCKETS.blogImages,
];

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

/**
 * Module materials are **PDF only**, deliberately.
 *
 * Not because PDF is harder to copy — it is not. Anything the browser renders
 * has already been downloaded to the machine, and a PDF in a viewer is one
 * network-tab save away. The reason is the opposite: PDF is the one format that
 * renders reliably *inline* in a viewer we control, so a student never needs to
 * be handed a file in the first place. A .docx or .xlsx has to leave the site to
 * be opened at all.
 *
 * Keeping it to a single type also means the student-side viewer has exactly one
 * rendering path to get right.
 *
 * This is a list of one on purpose — a future addition must be a format that can
 * be displayed in-page, not merely a format that is convenient to upload.
 */
export const ACCEPTED_MODULE_FILE_TYPES = ['application/pdf'] as const;

/**
 * Content types the task-files bucket accepts.
 *
 * Deliberately wider than module materials, and for the opposite reason. A
 * material is course content a student *reads in the app*; a task file is a
 * brief, template or dataset a student has to **open and work on**, so it must
 * be downloadable and it must be whatever format the assignment needs.
 *
 * Shared with `/api/admin/uploads` so the browser check and the server check
 * cannot drift.
 */
export const ACCEPTED_TASK_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
] as const;

/**
 * Content types allowed on a task-message attachment.
 *
 * This is a conversation between a student and a reviewer, so it carries
 * evidence of work: a screenshot, a document, a zipped project. Wider than
 * module materials (which are read in-app and therefore PDF-only) and narrower
 * than "anything", because an unrestricted bucket is a file host.
 *
 * Shared with `/api/admin/uploads` so the browser check and the server check
 * cannot drift.
 */
export const ACCEPTED_MESSAGE_ATTACHMENT_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'application/pdf',
  'application/zip',
  'text/plain',
] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
