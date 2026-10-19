-- 0037_task_message_attachment_cleanup.sql
--
-- Attachments on approved submissions are deleted from storage 7 days after
-- approval (`/api/cron/attachment-cleanup`), to stretch the free plan's 1 GB.
--
-- The row keeps `attachment_path` — the file name is part of what the thread
-- recorded — and gains the moment the object was removed, so the UI can say
-- "removed" instead of offering a download that 404s. A null here with a
-- non-null path means the file is still in the bucket.

alter table public.task_messages
  add column attachment_deleted_at timestamptz;
