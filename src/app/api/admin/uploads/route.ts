import { NextResponse } from 'next/server';
import { ApiError, badRequest, withRoute } from '@/lib/api/errors';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { bucketNameSchema, uploadFolderSchema } from '@/lib/schemas/uploads.schema';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_MESSAGE_ATTACHMENT_TYPES,
  ACCEPTED_MODULE_FILE_TYPES,
  ACCEPTED_TASK_FILE_TYPES,
  BUCKETS,
  BUCKET_PATH_SEGMENTS,
  MAX_UPLOAD_BYTES,
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
 * POST /api/admin/uploads — upload one file to a storage bucket (admin).
 *
 * Takes `multipart/form-data` with `bucket`, `folder` and `file`, and returns
 * the resulting object path. It deliberately does **not** write that path to
 * any table: the caller decides which column it belongs in, which is what lets
 * one endpoint serve thumbnails, module files, task files and attachments.
 *
 * The client validates size and type too (`imageFileSchema`); that copy is for
 * fast feedback, this one is the boundary that actually enforces it.
 */
export const POST = withRoute(async (req) => {
  await requireStaff();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw badRequest('Request must be multipart/form-data');
  }

  const bucket = bucketNameSchema.parse(formData.get('bucket'));
  const folder = uploadFolderSchema.parse(formData.get('folder'));
  const file = formData.get('file');

  if (!(file instanceof File)) throw badRequest('Missing "file" part');
  if (file.size === 0) throw badRequest('Uploaded file is empty');

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, `File exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} limit`);
  }

  if (!ACCEPTED_TYPES[bucket].includes(file.type)) {
    throw badRequest(`Content type "${file.type}" is not allowed for bucket "${bucket}"`);
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

  // The request-scoped client, not the service-role one: the admin's own
  // session satisfies the bucket's write policy, so RLS stays in force.
  const supabase = await createClient();
  const path = storagePath(folders, file.name);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    // `storagePath` timestamps every name, so a collision means something is
    // wrong rather than a re-upload — fail loudly instead of overwriting.
    upsert: false,
  });

  if (error) throw new ApiError(502, `Upload failed: ${error.message}`);

  return NextResponse.json({ data: { bucket, path } }, { status: 201 });
});
