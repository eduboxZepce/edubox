'use client';

import { useMutation } from '@tanstack/react-query';
import { ApiRequestError, apiPost, type Envelope } from '@/lib/api/client';
import { compressImage } from '@/lib/images/compressImage';
import { createClient } from '@/lib/supabase/client';
import { BUCKET_MAX_BYTES, IMAGE_BUCKETS, formatBytes, type BucketName } from '@/lib/storage';
import type { SignUploadRequest, SignedUpload, UploadResult } from '@/lib/schemas/uploads.schema';

/**
 * File uploads. One hook covers every bucket — thumbnails, module files, task
 * files, message attachments — because the endpoint is generic over them.
 *
 * There is no query counterpart and no cache to invalidate: an upload produces
 * a path, and it's the *owning record's* mutation (e.g. `useUpdateCourse`) that
 * saves it and refreshes the relevant caches.
 */

export type UploadFileVariables = {
  bucket: BucketName;
  /** The owning ids, in the order the bucket's path convention expects. */
  folders: string[];
  file: File;
};

/**
 * Three steps, all invisible to the caller:
 *
 *   1. Images bound for a public bucket are resized and re-encoded in the
 *      browser (`compressImage`) — the cheapest place to save storage.
 *   2. `POST /api/admin/uploads` checks the claim and signs a one-time upload.
 *   3. The bytes go straight to Supabase Storage. They never pass through a
 *      Vercel function, whose 4.5 MB body cap would otherwise rule out a
 *      normal-sized PDF deck.
 *
 * The returned path is the same shape it always was.
 */
async function uploadFile({ bucket, folders, file }: UploadFileVariables): Promise<UploadResult> {
  const upload = IMAGE_BUCKETS.includes(bucket) ? await compressImage(file) : file;

  // Checked after compression, so a 12 MB phone photo that becomes 250 KB is
  // fine, and before signing, so an oversized PDF fails without a round trip.
  const maxBytes = BUCKET_MAX_BYTES[bucket];
  if (upload.size > maxBytes) {
    throw new ApiRequestError(413, `Datoteka je prevelika — najviše ${formatBytes(maxBytes)}.`);
  }

  const signed = await apiPost<Envelope<SignedUpload>>('/api/admin/uploads', {
    bucket,
    folder: folders.join('/'),
    fileName: upload.name,
    contentType: upload.type,
    size: upload.size,
  } satisfies SignUploadRequest);

  const { path, token } = signed.data;
  const { error } = await createClient()
    .storage.from(bucket)
    .uploadToSignedUrl(path, token, upload, { contentType: upload.type });

  // Storage enforces the bucket's own size and type limits here, so this is
  // also where a client that lied in step 2 ends up.
  if (error) {
    if (/size|too large/i.test(error.message)) {
      throw new ApiRequestError(413, `Datoteka je prevelika — najviše ${formatBytes(maxBytes)}.`);
    }
    throw new ApiRequestError(502, `Upload failed: ${error.message}`);
  }

  return { bucket, path };
}

/**
 * POST /api/admin/uploads
 *
 *   const upload = useUploadFile();
 *   const { path } = await upload.mutateAsync({
 *     bucket: BUCKETS.courseThumbnails,
 *     folders: [course.id],
 *     file,
 *   });
 */
export function useUploadFile() {
  return useMutation({ mutationFn: uploadFile });
}
