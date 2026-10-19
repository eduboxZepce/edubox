import { NextResponse } from 'next/server';
import { ApiError, badRequest, parseBody, withRoute } from '@/lib/api/errors';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { signUploadRequestSchema } from '@/lib/schemas/uploads.schema';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_MESSAGE_ATTACHMENT_TYPES,
  ACCEPTED_MODULE_FILE_TYPES,
  ACCEPTED_TASK_FILE_TYPES,
  BUCKETS,
  BUCKET_MAX_BYTES,
  BUCKET_PATH_SEGMENTS,
  type BucketName,
  formatBytes,
  storagePath,
} from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Which content types each bucket accepts. Thumbnails are rendered in an
 * `<img>`, so they're restricted to formats browsers actually decode; the
 * attachment buckets accept the document types students and admins exchange.
 *
 * An empty list would mean "anything", which we never want — an unrestricted
 * public bucket is an open file host.
 */
const ACCEPTED_TYPES: Record<BucketName, readonly string[]> = {
  [BUCKETS.courseThumbnails]: ACCEPTED_IMAGE_TYPES,
  // Shared with the browser-side check in `moduleFileSchema`, so the two
  // cannot disagree about what a material may be.
  [BUCKETS.moduleFiles]: ACCEPTED_MODULE_FILE_TYPES,
  // Shared with `taskFileSchema` in the browser.
  [BUCKETS.taskFiles]: ACCEPTED_TASK_FILE_TYPES,

  // Shared with `messageAttachmentSchema` in the browser.
  [BUCKETS.taskMessageAttachments]: ACCEPTED_MESSAGE_ATTACHMENT_TYPES,

  /*
   * Images only, and the same list as thumbnails. This bucket is public and is
   * written by the newsletter composer, so the type check is what stops it
   * becoming a general-purpose file host on a URL anyone can read.
   */
  [BUCKETS.newsletterImages]: ACCEPTED_IMAGE_TYPES,

  // Public too, for the same reason: images only.
  [BUCKETS.blogImages]: ACCEPTED_IMAGE_TYPES,
};

/**
 * POST /api/admin/uploads — sign one upload to a storage bucket (staff).
 *
 * Takes JSON describing the file (`bucket`, `folder`, `fileName`,
 * `contentType`, `size`) and returns the object path plus a one-time token.
 * The browser then sends the bytes **straight to Supabase Storage** with
 * `uploadToSignedUrl` — the file never passes through this function.
 *
 * ## Why signed, not proxied
 *
 * It used to take the file as multipart. A Vercel function's request body is
 * capped at 4.5 MB, so anything bigger died with a platform 413 before this
 * code ran — and a PowerPoint deck exported to PDF is routinely 5–25 MB.
 *
 * ## Where the limits are enforced now
 *
 * The size and type checked here are what the client *claims*; they exist to
 * give a clear message before any bytes move. The real boundary is the
 * bucket's own `file_size_limit` and `allowed_mime_types` (migration 0036),
 * which storage applies to the actual upload. Keep the two in step via
 * `BUCKET_MAX_BYTES` and the `ACCEPTED_*` lists.
 *
 * The path is still built here, and the signing call runs on the caller's own
 * client, so the bucket's write policy (and its folder-depth rule) is checked
 * exactly as it was for a direct upload. Persisting the path to the owning
 * record remains the caller's job.
 */
export const POST = withRoute(async (req) => {
  await requireStaff();

  const { bucket, folder, fileName, contentType, size } = await parseBody(
    req,
    signUploadRequestSchema,
  );

  const maxBytes = BUCKET_MAX_BYTES[bucket];
  if (size > maxBytes) {
    throw new ApiError(413, `File exceeds the ${formatBytes(maxBytes)} limit`);
  }

  if (!ACCEPTED_TYPES[bucket].includes(contentType)) {
    throw badRequest(`Content type "${contentType}" is not allowed for bucket "${bucket}"`);
  }

  // The RLS policies read fixed folder positions out of the path (see migration
  // 0013), so a path with the wrong depth would upload fine and then be
  // unreadable. Reject it here instead of creating an orphaned object.
  const folders = folder.split('/');
  const expectedDepth = BUCKET_PATH_SEGMENTS[bucket];
  if (folders.length !== expectedDepth) {
    throw badRequest(
      `Bucket "${bucket}" expects ${expectedDepth} folder segment(s), received ${folders.length}`,
    );
  }

  // The request-scoped client, not the service-role one: signing requires
  // INSERT on the object under the admin's own session, so RLS stays in force.
  // `storagePath` timestamps every name, so the token can never overwrite.
  const supabase = await createClient();
  const path = storagePath(folders, fileName);

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data) {
    throw new ApiError(502, `Could not prepare the upload: ${error?.message ?? 'no token'}`);
  }

  return NextResponse.json({ data: { bucket, path, token: data.token } }, { status: 201 });
});
