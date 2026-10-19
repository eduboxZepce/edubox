import { NextResponse } from 'next/server';
import {
  conflict,
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
import { adminIds, notifyAfterResponse } from '@/lib/services/notifications';
import { metaFor, rangeFor } from '@/lib/schemas/common.schema';
import { createPurchaseSchema, listPurchasesQuerySchema } from '@/lib/schemas/purchases.schema';

export const dynamic = 'force-dynamic';

/** GET /api/purchases — the caller's own purchases (student). */
export const GET = withRoute(async (req) => {
  const { userId } = await requireUser();
  const query = parseQuery(req, listPurchasesQuerySchema);

  const supabase = await createClient();
  const [from, to] = rangeFor(query);

  let q = supabase
    .from('purchases')
    .select('*, courses(id, name, slug, thumbnail_path)', { count: 'exact' })
    .eq('student_id', userId);

  if (query.status) q = q.eq('status', query.status);
  if (query.courseId) q = q.eq('course_id', query.courseId);

  const result = await q.order('created_at', { ascending: false }).range(from, to);

  return NextResponse.json({
    data: unwrapMany(result),
    meta: metaFor(query, result.count ?? 0),
  });
});

/**
 * POST /api/purchases — request a purchase (student).
 *
 * Price is snapshotted from the course server-side and status is forced to
 * 'requested'; accepting either from the client would let a student name their
 * own price or self-approve. RLS enforces the same rule independently.
 */
export const POST = withRoute(async (req) => {
  const { userId, profile } = await requireUser();
  const body = await parseBody(req, createPurchaseSchema);

  const supabase = await createClient();

  const course = unwrapOne(
    await supabase
      .from('courses')
      .select('id, name, price')
      .eq('id', body.course_id)
      .eq('published', true)
      .maybeSingle(),
  );

  const existing = unwrapMaybe(
    await supabase
      .from('purchases')
      .select('id, status')
      .eq('course_id', course.id)
      .eq('student_id', userId)
      .in('status', ['requested', 'approved'])
      .maybeSingle(),
  );
  if (existing) {
    throw conflict(
      existing.status === 'approved'
        ? 'You already own this course'
        : 'You already have a pending request for this course',
    );
  }

  const created = unwrapOne(
    await supabase
      .from('purchases')
      .insert({
        student_id: userId,
        course_id: course.id,
        price: course.price,
        status: 'requested',
      })
      .select()
      .single(),
  );

  // Admins are the only ones who can act on this, so they are the only ones
  // told. Scheduled after the response — the student's request has already
  // succeeded and must not depend on anyone's inbox.
  notifyAfterResponse({
    userIds: await adminIds(createServiceRoleClient()),
    type: 'purchase_requested',
    title: 'Novi zahtjev za kupovinu',
    body: `${profile.full_name} je zatražio/la pristup obuci „${course.name}”. Poziv na broj: ${created.readable_id}.`,
    link: `/admin/purchases/${created.id}`,
    email: {
      subject: `Novi zahtjev za pristup — ${course.name}`,
      heading: 'Novi zahtjev za kupovinu',
      lines: [
        `${profile.full_name} (${profile.email}) je zatražio/la pristup obuci „${course.name}”.`,
        // The reference is what makes this actionable: it is what the payment
        // will arrive under, so an admin can reconcile without opening the app.
        `Poziv na broj: ${created.readable_id}.`,
        'Odobrite zahtjev tek nakon što je uplata potvrđena.',
      ],
      action: { label: 'Otvori zahtjev', href: `/admin/purchases/${created.id}` },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
});
