import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BUCKETS } from '@/lib/storage';

/**
 * How long an approved submission keeps its attachments.
 *
 * Approval closes the thread for good, so after a short window nobody needs the
 * files to *act* on — but deleting them the instant someone clicks "approve"
 * would take the work away from the reviewer mid-glance, and leave nothing to
 * look at if the decision is questioned the next day. A week covers both.
 */
export const ATTACHMENT_RETENTION_DAYS = 7;

/** Rows per run. Storage `remove()` takes a list; this keeps one call sane. */
const BATCH_SIZE = 500;

/**
 * Deletes attachment objects on submissions approved more than
 * `ATTACHMENT_RETENTION_DAYS` ago, and stamps `attachment_deleted_at` on their
 * messages. Called daily by `/api/cron/attachment-cleanup`.
 *
 * "Approved at" is `task_submissions.updated_at`. That is sound because an
 * approved thread is sealed — every write path 409s on it (§7, "Approval
 * closes the thread") — so nothing moves the timestamp afterwards. If
 * something ever did, the file would simply be kept a little longer, which is
 * the safe direction.
 *
 * Service role throughout: no user owns this job, and the student's own write
 * policy would not cover a reviewer's attachment anyway.
 */
export async function cleanUpApprovedAttachments(): Promise<{ deleted: number }> {
  const svc = createServiceRoleClient();
  const cutoff = new Date(Date.now() - ATTACHMENT_RETENTION_DAYS * 86_400_000).toISOString();

  // `!inner`, or the filters on the embedded submission are ignored and every
  // message with an attachment comes back (see ADMIN_SUBMISSION_SELECT).
  const { data, error } = await svc
    .from('task_messages')
    .select('id, attachment_path, task_submissions!inner(status, updated_at)')
    .not('attachment_path', 'is', null)
    .is('attachment_deleted_at', null)
    .eq('task_submissions.status', 'approved')
    .lt('task_submissions.updated_at', cutoff)
    .limit(BATCH_SIZE);

  if (error) throw new Error(`Listing attachments failed: ${error.message}`);
  if (!data.length) return { deleted: 0 };

  const paths = data.map((row) => row.attachment_path).filter((p): p is string => Boolean(p));

  // An object that is already gone is not an error here — `remove()` just
  // leaves it out of the result — so the rows are marked either way.
  const removal = await svc.storage.from(BUCKETS.taskMessageAttachments).remove(paths);
  if (removal.error) throw new Error(`Removing attachments failed: ${removal.error.message}`);

  const { error: updateError } = await svc
    .from('task_messages')
    .update({ attachment_deleted_at: new Date().toISOString() })
    .in(
      'id',
      data.map((row) => row.id),
    );

  if (updateError) throw new Error(`Marking attachments failed: ${updateError.message}`);

  return { deleted: data.length };
}
