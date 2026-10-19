import { NextResponse } from 'next/server';
import {
  conflict,
  forbidden,
  parseBody,
  parseQuery,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  withRoute,
} from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { courseReviewerIds, notifyAfterResponse } from '@/lib/services/notifications';
import { metaFor, paginationQuerySchema, rangeFor, uuidSchema } from '@/lib/schemas/common.schema';
import { createSubmissionSchema } from '@/lib/schemas/task-submissions.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ taskId: string }> };

/**
 * POST /api/tasks/:taskId/submissions — open a submission thread (student).
 *
 * Uses the RLS client: students have an INSERT policy on both tables scoped to
 * their own rows, so no service-role escalation is warranted here.
 */
/**
 * GET /api/tasks/:taskId/submissions — the caller's own submissions for a task.
 *
 * Added because there was no way for a student to find a submission again once
 * they navigated away: `POST` returns the new row, but nothing listed it, so the
 * thread and its outcome became unreachable on the next page load.
 *
 * Scoped to `student_id = caller` **explicitly**, not left to RLS. The select
 * policy also admits admins and the reviewing teacher, so without this filter a
 * teacher calling it would get everyone's submissions from what is meant to be
 * the student's own view. Listing other people's work is `/api/admin/submissions`.
 *
 * Newest first: a task can be resubmitted after `needs_revision`, so the first
 * row is the one that matters.
 */
export const GET = withRoute(async (req, ctx: Ctx) => {
  const { userId } = await requireUser();
  const taskId = uuidSchema.parse((await ctx.params).taskId);
  const query = parseQuery(req, paginationQuerySchema);

  const supabase = await createClient();
  const [from, to] = rangeFor(query);

  const result = await supabase
    .from('task_submissions')
    .select('*', { count: 'exact' })
    .eq('task_id', taskId)
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  return NextResponse.json({
    data: unwrapMany(result),
    meta: metaFor(query, result.count ?? 0),
  });
});

export const POST = withRoute(async (req, ctx: Ctx) => {
  const { userId, profile } = await requireUser();
  const taskId = uuidSchema.parse((await ctx.params).taskId);
  const body = await parseBody(req, createSubmissionSchema);

  const supabase = await createClient();

  // Readable via RLS only with an approved purchase, so this doubles as the
  // access check.
  const task = unwrapMaybe(
    await supabase
      .from('tasks')
      .select('id, modules(id, title, course_id, courses(name))')
      .eq('id', taskId)
      .maybeSingle(),
  );
  if (!task) throw forbidden('An approved purchase is required for this task');

  const open = unwrapMaybe(
    await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('student_id', userId)
      .in('status', ['pending', 'needs_revision'])
      .maybeSingle(),
  );
  if (open) throw conflict('You already have an open submission for this task');

  const submission = unwrapOne(
    await supabase
      .from('task_submissions')
      .insert({ task_id: taskId, student_id: userId, status: 'pending' })
      .select()
      .single(),
  );

  const message = unwrapOne(
    await supabase
      .from('task_messages')
      .insert({
        submission_id: submission.id,
        sender_id: userId,
        body: body.body,
        attachment_path: body.attachment_path ?? null,
      })
      .select()
      .single(),
  );

  // Everyone who may review this course's work: the admins and the owning
  // teacher. Resolved with the service role because the student's own client
  // cannot see who those people are, and should not be able to.
  const courseId = task.modules?.course_id;
  if (courseId) {
    const courseName = task.modules?.courses?.name ?? 'obuka';
    const moduleTitle = task.modules?.title ?? 'modul';
    const href = `/admin/submissions/${submission.id}`;

    notifyAfterResponse({
      userIds: await courseReviewerIds(createServiceRoleClient(), courseId),
      type: 'submission_received',
      title: 'Novo predano rješenje',
      body: `${profile.full_name} je predao/la rješenje za „${moduleTitle}” (${courseName}).`,
      link: href,
      email: {
        subject: `Novo rješenje za pregled — ${courseName}`,
        heading: 'Novo predano rješenje',
        lines: [
          `${profile.full_name} je predao/la rješenje zadatka za modul „${moduleTitle}” na obuci „${courseName}”.`,
          'Otvorite predaju da pročitate rješenje i odgovorite.',
        ],
        action: { label: 'Otvori predaju', href },
      },
    });
  }

  return NextResponse.json({ data: { ...submission, message } }, { status: 201 });
});
