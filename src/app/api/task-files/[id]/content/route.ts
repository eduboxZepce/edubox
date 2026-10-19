import { NextResponse } from 'next/server';
import { ApiError, notFound, unwrapMaybe, withRoute } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { assertModuleAccess } from '@/lib/auth/courseAccess';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BUCKETS, displayFileName } from '@/lib/storage';
import { uuidSchema } from '@/lib/schemas/common.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/task-files/:id/content — a file attached to a task brief.
 *
 * ## The near-twin of the module-materials proxy, with the opposite ending
 *
 * Same shape: private bucket, look the row up under RLS, resolve access through
 * `assertModuleAccess`, then stream the object with the service role so the
 * storage URL is never handed out.
 *
 * The difference is `Content-Disposition`, and it is the whole point.
 * A module material is protected reading — `inline`, rendered in the app, never
 * saved. A task file is a **working document**: the brief says "start from the
 * attached spreadsheet", so the student has to be able to open it in the
 * program that edits it. This one is `attachment`.
 *
 * That mirrors the `<ModuleMaterials>` / `<TaskFiles>` split on the UI side —
 * two things that look alike and encode opposite policies. Until this route
 * existed the student screen showed "Preuzimanje uskoro" beside every task
 * attachment, because there was simply nothing serving them.
 *
 * ## Content type comes from storage, not from us
 *
 * Module materials are PDF-only, so that route can hard-code the type. Task
 * files may be several formats (`ACCEPTED_TASK_FILE_TYPES`), so the type is
 * whatever the object was stored as, with a safe fallback.
 */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  const auth = await requireUser();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();

  const file = unwrapMaybe(
    await supabase
      .from('task_files')
      .select('file_path, file_name, tasks(module_id)')
      .eq('id', id)
      .maybeSingle(),
  );

  if (!file?.tasks) throw notFound();

  // Admin, the owning teacher, or an approved purchase — the same rule that
  // guards everything else on the module.
  await assertModuleAccess(supabase, file.tasks.module_id, auth);

  const svc = createServiceRoleClient();
  const { data, error } = await svc.storage.from(BUCKETS.taskFiles).download(file.file_path);

  if (error || !data) {
    throw new ApiError(502, `Could not read the file: ${error?.message ?? 'missing object'}`);
  }

  // `file_name` is what the teacher uploaded; the stored path carries the
  // timestamp prefix `safeFileName()` adds, which the reader must never see.
  const name = file.file_name ?? displayFileName(file.file_path) ?? 'prilog';

  // Streamed, not `arrayBuffer()` — see the module-files content route.
  return new NextResponse(data.stream(), {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Length': String(data.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
