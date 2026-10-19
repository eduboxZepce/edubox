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
import { metaFor, paginationQuerySchema, rangeFor, uuidSchema } from '@/lib/schemas/common.schema';
import {
  createMessageSchema,
  type TaskSubmissionStatus,
} from '@/lib/schemas/task-submissions.schema';
import { applyModuleProgress, maybeIssueCertificate } from '@/lib/services/progress';
import { canReviewTask } from '@/lib/auth/courseAccess';
import { courseReviewerIds, notifyAfterResponse } from '@/lib/services/notifications';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/submissions/:id/messages — thread, scoped to participants. */
export const GET = withRoute(async (req, ctx: Ctx) => {
  await requireUser();
  const submissionId = uuidSchema.parse((await ctx.params).id);
  const query = parseQuery(req, paginationQuerySchema);

  const supabase = await createClient();
  const [from, to] = rangeFor(query);

  // RLS restricts this to the owning student and admins.
  const result = await supabase
    .from('task_messages')
    .select('*', { count: 'exact' })
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })
    .range(from, to);

  return NextResponse.json({
    data: unwrapMany(result),
    meta: metaFor(query, result.count ?? 0),
  });
});

/**
 * POST /api/submissions/:id/messages — add a message to the thread.
 *
 * Both sides post here. Only a **reviewer's** `status` is honoured, and only a
 * reviewer can drive the submission to `approved`, which is what marks the
 * module's task done and may in turn issue a certificate.
 *
 * ## A reviewer is an admin *or* the owning teacher
 *
 * This used to read `profile.role === 'admin'`, which contradicted the database:
 * `task_submissions_reviewer_update` (migration 0017) has always let the owning
 * teacher set the status, and reviewing submissions is part of the documented
 * teacher scope. The effect was that a teacher could open the thread and reply
 * but never actually decide anything — the one action the screen exists for.
 * `canReviewTask` is the same rule as the `can_review_submission()` predicate.
 *
 * ## Approval closes the thread
 *
 * Once a submission is `approved` nobody may add to it — not the student, not
 * the reviewer. The decision is final and the transcript behind it is the
 * record of how it was reached; letting either side keep writing would leave a
 * thread whose last word disagrees with its own outcome, and there is no
 * "unapprove" to resolve that with.
 *
 * Enforced here rather than only in the UI, because both screens hide their
 * composer on `approved` and neither hiding is a control. `needs_revision` is
 * deliberately *not* closed — that status exists precisely to invite a reply.
 */
export const POST = withRoute(async (req, ctx: Ctx) => {
  const { userId, profile } = await requireUser();
  const submissionId = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, createMessageSchema);

  const supabase = await createClient();

  const submission = unwrapMaybe(
    await supabase
      .from('task_submissions')
      .select('id, task_id, student_id, status')
      .eq('id', submissionId)
      .maybeSingle(),
  );
  if (!submission) throw forbidden('You are not a participant in this submission');

  if (submission.status === 'approved') {
    throw conflict('This submission has been approved; the thread is closed');
  }

  const message = unwrapOne(
    await supabase
      .from('task_messages')
      .insert({
        submission_id: submissionId,
        sender_id: userId,
        body: body.body,
        attachment_path: body.attachment_path ?? null,
      })
      .select()
      .single(),
  );

  // Annotated rather than inferred: the `approved` guard above narrows
  // `submission.status` to the two open states, and the reviewer branch below
  // may well set it to the third.
  let status: TaskSubmissionStatus = submission.status;
  let moduleCompleted = false;
  let certificateIssued = false;

  // A student may include `status`; it is ignored rather than rejected so the
  // same endpoint serves both sides of the conversation.
  if (body.status && body.status !== submission.status) {
    // The service-role client throughout: approving writes `module_progress`
    // and may insert a certificate, neither of which a teacher may touch
    // directly. RLS is therefore off for the rest of this branch, and
    // `canReviewTask` — which compares `owner_id` explicitly rather than
    // leaning on a policy — is what stands in its place.
    const svc = createServiceRoleClient();

    if (await canReviewTask(svc, submission.task_id, { userId, profile })) {
      const updated = unwrapOne(
        await svc
          .from('task_submissions')
          .update({ status: body.status })
          .eq('id', submissionId)
          .select('status, task_id, student_id')
          .single(),
      );
      status = updated.status;

      if (updated.status === 'approved') {
        const task = unwrapOne(
          await svc.from('tasks').select('module_id').eq('id', updated.task_id).single(),
        );
        const mod = unwrapOne(
          await svc.from('modules').select('course_id').eq('id', task.module_id).single(),
        );

        const progress = await applyModuleProgress(svc, {
          moduleId: task.module_id,
          studentId: updated.student_id,
          taskDone: true,
        });
        moduleCompleted = progress.completed;

        if (progress.completed) {
          const result = await maybeIssueCertificate(svc, {
            courseId: mod.course_id,
            studentId: updated.student_id,
          });
          certificateIssued = result.issued;
        }
      }
    }
  }

  await notifyThread({
    submissionId,
    senderId: userId,
    senderName: profile.full_name,
    studentId: submission.student_id,
    taskId: submission.task_id,
    body: body.body,
    previousStatus: submission.status,
    status,
  });

  return NextResponse.json(
    {
      data: message,
      submission_status: status,
      module_completed: moduleCompleted,
      certificate_issued: certificateIssued,
    },
    { status: 201 },
  );
});

/**
 * Who hears about a message, and what they hear.
 *
 * Split out because there are two overlapping questions and inlining both left
 * the handler unreadable:
 *
 *   - **the message itself** goes to the other side of the thread. Never to the
 *     sender: an email telling you what you just wrote is the fastest way to
 *     get someone to switch notifications off entirely.
 *   - **a decision** goes to the student, and only when the status actually
 *     changed. A reviewer re-selecting the status a thread already has is not
 *     news, which is why `previousStatus` is compared rather than just read.
 *
 * A decision therefore sends *two* notifications to the student — the reply and
 * the outcome — and that is intended. They are different facts, they carry
 * different preference switches, and a student who muted thread chatter should
 * still be told their work was accepted.
 */
async function notifyThread(input: {
  submissionId: string;
  senderId: string;
  senderName: string;
  studentId: string;
  taskId: string;
  body: string;
  previousStatus: string;
  status: string;
}) {
  const svc = createServiceRoleClient();

  const task = unwrapMaybe(
    await svc
      .from('tasks')
      .select('module_id, modules(title, course_id, courses(name, slug))')
      .eq('id', input.taskId)
      .maybeSingle(),
  );

  const moduleTitle = task?.modules?.title ?? 'modul';
  const courseName = task?.modules?.courses?.name ?? 'obuka';
  const courseId = task?.modules?.course_id ?? null;
  const courseSlug = task?.modules?.courses?.slug ?? null;

  const fromStudent = input.senderId === input.studentId;

  // Reviewers reach the thread through the admin screen, the student through
  // the module. Same conversation, two different doors.
  const reviewerHref = `/admin/submissions/${input.submissionId}`;
  // Straight to the thread rather than to the student's hub. Being told your
  // work was reviewed and then landing on a menu is a step for no reason. Falls
  // back to their courses if the course was deleted out from under it.
  const studentHref = courseSlug
    ? `/courses/${courseSlug}/modules/${task?.module_id}/task`
    : '/dashboard/courses';

  // An excerpt, not the whole message: the point is to bring someone back to
  // the thread, and a long paste in an email body is worse at that than a line.
  const excerpt = input.body.length > 160 ? `${input.body.slice(0, 157)}…` : input.body;

  const recipients = fromStudent
    ? courseId
      ? await courseReviewerIds(svc, courseId)
      : []
    : [input.studentId];

  notifyAfterResponse({
    // A reviewer replying to their own course is filtered out here, which also
    // covers the admin who is both a reviewer and the sender.
    userIds: recipients.filter((id) => id !== input.senderId),
    type: 'submission_message',
    title: 'Nova poruka o zadatku',
    body: `${input.senderName} (${moduleTitle}): ${excerpt}`,
    link: fromStudent ? reviewerHref : studentHref,
    email: {
      subject: `Nova poruka o zadatku — ${courseName}`,
      heading: 'Nova poruka u prepisci',
      lines: [`${input.senderName} je poslao/la poruku o zadatku „${moduleTitle}”:`, excerpt],
      action: {
        label: 'Otvori prepisku',
        href: fromStudent ? reviewerHref : studentHref,
      },
    },
  });

  if (input.status === input.previousStatus) return;

  if (input.status === 'needs_revision') {
    notifyAfterResponse({
      userIds: [input.studentId],
      type: 'submission_needs_revision',
      title: 'Potrebna je izmjena rješenja',
      body: `Predavač traži izmjenu rješenja za „${moduleTitle}” (${courseName}).`,
      link: studentHref,
      email: {
        subject: `Potrebna izmjena — ${moduleTitle}`,
        heading: 'Potrebna je izmjena rješenja',
        lines: [
          `Predavač je pregledao vaše rješenje zadatka za modul „${moduleTitle}” na obuci „${courseName}” i traži izmjenu.`,
          excerpt,
          'Ispravite rješenje i odgovorite u istoj prepisci.',
        ],
        action: { label: 'Otvori zadatak', href: studentHref },
      },
    });
  }

  if (input.status === 'approved') {
    notifyAfterResponse({
      userIds: [input.studentId],
      type: 'submission_approved',
      title: 'Rješenje je prihvaćeno',
      body: `Zadatak za „${moduleTitle}” (${courseName}) je završen.`,
      link: studentHref,
      email: {
        subject: `Rješenje prihvaćeno — ${moduleTitle}`,
        heading: 'Rješenje je prihvaćeno',
        lines: [
          `Vaše rješenje zadatka za modul „${moduleTitle}” na obuci „${courseName}” je prihvaćeno.`,
          'Zadatak je time završen, a prepiska je zatvorena.',
        ],
        action: { label: 'Otvori zadatak', href: studentHref },
      },
    });
  }
}
