import { z } from '@/lib/openapi/zod';
import { BUCKETS } from '@/lib/storage';

/**
 * Contract for `POST /api/admin/uploads` (which signs an upload) and for the
 * multipart submission-attachment route (which still proxies one).
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

/**
 * `POST /api/admin/uploads` body: a description of the file, not the file.
 * The browser then sends the bytes straight to storage with the returned token.
 */
export const signUploadRequestSchema = z
  .object({
    bucket: bucketNameSchema,
    folder: uploadFolderSchema,
    fileName: z.string().trim().min(1).max(200),
    contentType: z.string().min(1),
    size: z.number().int().positive(),
  })
  .openapi('SignUploadRequest');

export const signedUploadSchema = uploadResultSchema
  .extend({
    token: z.string().openapi({ description: 'Pass to `uploadToSignedUrl` with `path`' }),
  })
  .openapi('SignedUpload');

export const signedUploadResponseSchema = z
  .object({ data: signedUploadSchema })
  .openapi('SignedUploadResponse');

export type BucketNameValue = z.infer<typeof bucketNameSchema>;
export type UploadResult = z.infer<typeof uploadResultSchema>;
export type SignUploadRequest = z.infer<typeof signUploadRequestSchema>;
export type SignedUpload = z.infer<typeof signedUploadSchema>;
