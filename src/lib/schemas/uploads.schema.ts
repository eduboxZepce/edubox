import { z } from '@/lib/openapi/zod';
import { BUCKETS, MAX_UPLOAD_BYTES } from '@/lib/storage';

/**
 * Contract for `POST /api/admin/uploads`.
 *
 * The request is `multipart/form-data`, so unlike every other endpoint there is
 * no JSON body schema — the route validates the individual form fields against
 * the pieces below instead.
 */

export const bucketNameSchema = z
  .enum([
    BUCKETS.courseThumbnails,
    BUCKETS.moduleFiles,
    BUCKETS.taskFiles,
    BUCKETS.taskMessageAttachments,
    BUCKETS.newsletterImages,
    BUCKETS.blogImages,
  ])
  .openapi('BucketName', { description: 'Target storage bucket' });

/**
 * The id folders the object path must start with, as a `/`-joined string —
 * `{course_id}` for a thumbnail, `{course_id}/{module_id}` for a module file.
 * Each segment must be a uuid: the RLS policies parse them back out to decide
 * who may read the object.
 */
export const uploadFolderSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.split('/').every((segment) => z.uuid().safeParse(segment).success), {
    message: 'Every folder segment must be a uuid',
  })
  .openapi('UploadFolder', { example: '3f6c1b1e-6d5a-4c1e-9f0a-2b7d8e5c4a10' });

export const uploadResultSchema = z
  .object({
    bucket: bucketNameSchema,
    path: z.string().openapi({ description: 'Object path within the bucket' }),
  })
  .openapi('UploadResult');

export const uploadResponseSchema = z
  .object({ data: uploadResultSchema })
  .openapi('UploadResponse');

/** Documented here so the limit appears in `/api-docs` alongside the endpoint. */
export const UPLOAD_MAX_BYTES = MAX_UPLOAD_BYTES;

export type BucketNameValue = z.infer<typeof bucketNameSchema>;
export type UploadResult = z.infer<typeof uploadResultSchema>;
