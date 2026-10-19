import { NextResponse } from 'next/server';
import { ApiError, notFound, unwrapMaybe, withRoute } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BUCKETS, displayFileName } from '@/lib/storage';
import { uuidSchema } from '@/lib/schemas/common.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/messages/:id/attachment — download a message's attachment.
 *
 * Same proxy shape as `/api/module-files/:id/content`: the bucket is private, so
 * the file is streamed through a route rather than handed out as a signed URL
 * the recipient could pass on.
 *
 * The difference is `Content-Disposition`. Module materials are **inline**
 * because they are read in the app and never handed over. A submission
 * attachment is the opposite — a reviewer needs to open the student's actual
 * work, and a student needs the reviewer's marked-up file — so this one is
 * **attachment**, i.e. downloaded on purpose.
 *
 * Access rides on RLS: `task_messages` is readable only by the thread's
 * participants and admins, so a message that is not yours simply is not found.
 * The service-role client is used for the object read only, after that check.
 */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  await requireUser();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();

  const message = unwrapMaybe(
    await supabase
      .from('task_messages')
      .select('attachment_path, attachment_deleted_at')
      .eq('id', id)
      .maybeSingle(),
  );

  if (!message?.attachment_path) throw notFound();

  // Removed by the cleanup a week after approval. 410 rather than 404: the
  // message did carry a file, it just is not kept any more.
  if (message.attachment_deleted_at) {
    throw new ApiError(410, 'Prilog je uklonjen sedam dana nakon odobrenja rada.');
  }

  const svc = createServiceRoleClient();
  const { data, error } = await svc.storage
    .from(BUCKETS.taskMessageAttachments)
    .download(message.attachment_path);

  if (error || !data) {
    throw new ApiError(502, `Could not read the attachment: ${error?.message ?? 'missing object'}`);
  }

  // The stored name is timestamped by `storagePath()`; strip that prefix so the
  // reviewer gets the file back under the name the sender chose.
  const original = displayFileName(message.attachment_path) || 'prilog';

  // Streamed — see the module-files content route.
  return new NextResponse(data.stream(), {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Length': String(data.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(original)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
