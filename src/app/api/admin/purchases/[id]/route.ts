import { NextResponse } from 'next/server';
import { conflict, parseBody, unwrapOne, withRoute } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  updatePurchaseSchema,
  type PurchaseStatus,
  type UpdatePurchaseRequest,
} from '@/lib/schemas/purchases.schema';
import { notifyAfterResponse, type NotifyInput } from '@/lib/services/notifications';
import { uuidSchema } from '@/lib/schemas/common.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/purchases/:id — one purchase with its course and student (admin).
 *
 * Uses the RLS-scoped client, unlike the PATCH below: reading is something an
 * admin's own session is already entitled to do, so there's no reason to reach
 * for the service role. Only the status transition needs it.
 */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  const purchase = unwrapOne(
    await supabase
      .from('purchases')
      .select(
        '*, courses(id, name, slug, thumbnail_path), profiles!purchases_student_id_fkey(id, full_name, email)',
      )
      .eq('id', id)
      .maybeSingle(),
  );

  return NextResponse.json({ data: purchase });
});

/**
 * Which status a purchase may move to from where it stands now.
 *
 * Revoking is the one way back from an approval, and restoring is the one way
 * back from a revocation — so a mis-click on either can be undone, while a
 * denied request stays closed (the student simply asks again). Anything not
 * listed here is a 409 rather than a silent overwrite: without it, approving
 * an already-approved row would re-send "access granted" to the student.
 */
const PURCHASE_TRANSITIONS: Record<PurchaseStatus, UpdatePurchaseRequest['status'][]> = {
  requested: ['approved', 'denied'],
  approved: ['revoked'],
  revoked: ['approved'],
  denied: [],
};

/**
 * PATCH /api/admin/purchases/:id — approve, deny, revoke or restore (admin).
 *
 * This is the status transition that grants course access, so it runs with the
 * service role. `requireAdmin()` is the authorisation — the service-role client
 * performs none of its own.
 *
 * Revoking needs nothing beyond the status: every access check tests
 * `status = 'approved'`, so the student loses the modules on their next
 * request. Progress, submissions and certificates are left alone, which is what
 * lets a restore pick up exactly where they were.
 */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, updatePurchaseSchema);

  const svc = createServiceRoleClient();
  const current = unwrapOne(
    await svc.from('purchases').select('status, student_id, course_id').eq('id', id).maybeSingle(),
  );
  if (!PURCHASE_TRANSITIONS[current.status].includes(body.status)) {
    throw conflict(`Cannot change a purchase from ${current.status} to ${body.status}`);
  }

  // A revoked student may already have asked again. Restoring the old row too
  // would trip the one-open-request index with a bare 23505; say why instead.
  if (current.status === 'revoked') {
    const { count } = await svc
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', current.student_id)
      .eq('course_id', current.course_id)
      .in('status', ['requested', 'approved']);
    if (count) {
      throw conflict(
        'The student already has a newer request for this course — decide on that one',
      );
    }
  }

  // Conditioned on the status just read, so two admins acting at once cannot
  // both succeed (and both notify) — the loser matches no row.
  const updated = unwrapOne(
    await svc
      .from('purchases')
      .update({ status: body.status })
      .eq('id', id)
      .eq('status', current.status)
      .select('*, courses(id, name, slug)')
      .maybeSingle(),
  );

  const courseName = updated.courses?.name ?? 'obuka';
  const courseHref = updated.courses?.slug ? `/courses/${updated.courses.slug}` : '/courses';

  notifyAfterResponse({
    userIds: [updated.student_id],
    ...purchaseNotification(body.status, current.status, courseName, courseHref),
  });

  return NextResponse.json({ data: updated });
});

/** What the student is told about a transition. */
function purchaseNotification(
  next: UpdatePurchaseRequest['status'],
  previous: PurchaseStatus,
  courseName: string,
  courseHref: string,
): Omit<NotifyInput, 'userIds'> {
  if (next === 'approved') {
    const restored = previous === 'revoked';
    return {
      type: 'purchase_approved',
      title: restored ? 'Pristup obuci je vraćen' : 'Pristup obuci je odobren',
      body: restored
        ? `Ponovo možete pratiti obuku „${courseName}”. Vaš napredak je sačuvan.`
        : `Sada možete pratiti obuku „${courseName}”.`,
      link: courseHref,
      email: {
        subject: `${restored ? 'Pristup vraćen' : 'Pristup odobren'} — ${courseName}`,
        heading: restored ? 'Pristup obuci je vraćen' : 'Pristup obuci je odobren',
        lines: restored
          ? [
              `Ponovo vam je odobren pristup obuci „${courseName}”.`,
              'Vaš napredak je sačuvan — nastavite tamo gdje ste stali.',
            ]
          : [
              `Odobren vam je pristup obuci „${courseName}”.`,
              'Moduli se otključavaju redom — završite jedan da biste otvorili sljedeći.',
            ],
        action: { label: 'Otvori obuku', href: courseHref },
      },
    };
  }

  if (next === 'revoked') {
    return {
      type: 'purchase_revoked',
      title: 'Pristup obuci je opozvan',
      body: `Administrator vam je opozvao pristup obuci „${courseName}”.`,
      link: courseHref,
      email: {
        subject: `Pristup opozvan — ${courseName}`,
        heading: 'Pristup obuci je opozvan',
        lines: [
          `Administrator vam je opozvao pristup obuci „${courseName}”.`,
          // True, and the reassuring half: nothing is deleted on revoke.
          'Vaš napredak i certifikati su sačuvani. Ako mislite da je riječ o grešci, javite se podršci.',
        ],
        action: { label: 'Pogledaj obuku', href: courseHref },
      },
    };
  }

  return {
    type: 'purchase_denied',
    title: 'Zahtjev za pristup je odbijen',
    body: `Vaš zahtjev za pristup obuci „${courseName}” je odbijen.`,
    link: '/courses',
    email: {
      subject: `Zahtjev odbijen — ${courseName}`,
      heading: 'Zahtjev za pristup je odbijen',
      lines: [
        `Vaš zahtjev za pristup obuci „${courseName}” je odbijen.`,
        // True, and worth saying: the unique index excludes `denied`, so a
        // denial is not a permanent block.
        'Možete poslati novi zahtjev za istu obuku.',
      ],
      action: { label: 'Pogledaj obuku', href: courseHref },
    },
  };
}
