-- 0036_bucket_upload_limits.sql
--
-- Per-bucket size and type limits, enforced by Storage itself.
--
-- Until now the only check was in `/api/admin/uploads`, which received the
-- bytes. It no longer does: it signs an upload and the browser sends the file
-- straight to Storage (a Vercel function body is capped at 4.5 MB, which ruled
-- out an ordinary PDF deck). The route can only check what the client *claims*
-- about a file, so the real limit has to live on the bucket, where it applies
-- to the actual bytes of every upload — signed, direct or service-role.
--
-- Keep in step with `BUCKET_MAX_BYTES` and the `ACCEPTED_*_TYPES` lists in
-- `src/lib/storage.ts`. The two disagreeing is not a hole (the stricter side
-- wins), but it is a confusing error for whoever hits it.
--
-- Images are small on purpose: the free plan has 1 GB of storage in total,
-- and `compressImage()` resizes every image before upload, typically to
-- 100–300 KB.

update storage.buckets
set file_size_limit = 1048576, -- 1 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id in ('course-thumbnails', 'newsletter-images', 'blog-images');

-- A 50–100 slide deck exported to PDF is usually 3–15 MB, up to ~25 MB when it
-- is mostly photos.
update storage.buckets
set file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = array['application/pdf']
where id = 'module-files';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'application/pdf', 'application/zip', 'text/plain', 'text/csv'
    ]
where id = 'task-files';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'application/pdf', 'application/zip', 'text/plain'
    ]
where id = 'task-message-attachments';
