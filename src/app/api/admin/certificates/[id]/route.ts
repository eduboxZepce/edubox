import { NextResponse } from 'next/server';
import { notFound, parseBody, unwrapMaybe, unwrapOne, withRoute } from '@/lib/api/errors';
import { requireAdmin, requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/schemas/common.schema';
import { markDeliveredSchema } from '@/lib/schemas/certificates.schema';
import { notifyAfterResponse } from '@/lib/services/notifications';
import { SITE } from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * The projection both handlers return. `delivered_by` is aliased because
 * `certificates` now has *two* foreign keys into `profiles` — the student and
 * whoever posted the certificate — and PostgREST cannot guess which one a bare
 * `profiles(...)` means. Each embed names its constraint.
 */
const CERTIFICATE_SELECT =
  '*, courses(id, name, slug, thumbnail_path), profiles!certificates_student_id_fkey(id, full_name, email), deliverer:profiles!certificates_delivered_by_fkey(id, full_name)';

/** GET /api/admin/certificates/:id — one certificate with course + student. */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  await requireStaff();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  const certificate = unwrapOne(
    await supabase.from('certificates').select(CERTIFICATE_SELECT).eq('id', id).maybeSingle(),
  );

  return NextResponse.json({ data: certificate });
});

/**
 * PATCH /api/admin/certificates/:id — mark the printed certificate as posted.
 *
 * ## What this does and does not claim
 *
 * `requested_delivery` is the *student's* flag, set through
 * `/api/certificates/:id/request-delivery`, and stays theirs — this endpoint
 * never touches it. `delivered_at` is the other half of that conversation and
 * belongs to the admin who actually went to the post office. Until migration
 * 0024 there was no column for it at all, which is why these screens were
 * read-only and said so.
 *
 * ## Admin, not staff
 *
 * `requireAdmin`, unlike the GET beside it. Posting something physical is a
 * back-office act with no course scope — a teacher can see that a certificate
 * was earned on their course, but they are not the one mailing it, and
 * `certificates_admin_update` (migration 0014) is the matching database rule.
 * So this runs on the caller's own RLS-scoped client rather than the service
 * role: an admin already has the grant, and reaching for the service role would
 * discard the very check that makes this safe.
 *
 * ## Reversible on purpose
 *
 * `delivered: false` clears it. Marking the wrong row is an ordinary slip, and
 * with no way back an admin would be stuck with a record they know is wrong.
 * Contrast approving a submission, which is deliberately final.
 */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  const { userId } = await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, markDeliveredSchema);

  const supabase = await createClient();

  const existing = unwrapMaybe(
    await supabase
      .from('certificates')
      .select('id, student_id, delivered_at, readable_id, courses(name)')
      .eq('id', id)
      .maybeSingle(),
  );
  if (!existing) throw notFound('Certificate not found');

  const updated = unwrapOne(
    await supabase
      .from('certificates')
      .update(
        body.delivered
          ? { delivered_at: new Date().toISOString(), delivered_by: userId }
          : { delivered_at: null, delivered_by: null },
      )
      .eq('id', id)
      .select(CERTIFICATE_SELECT)
      .single(),
  );

  // Only on the transition into "sent". Un-marking is an admin correcting their
  // own records, and telling a student "actually, ignore that" would be worse
  // than saying nothing.
  if (body.delivered && !existing.delivered_at) {
    const courseName = existing.courses?.name ?? 'kurs';

    notifyAfterResponse({
      userIds: [existing.student_id],
      type: 'certificate_delivered',
      title: 'Certifikat je poslat poštom',
      body: `Štampani certifikat za kurs „${courseName}” je poslat na vašu adresu.`,
      link: `/certificates/${existing.readable_id}`,
      email: {
        subject: `Vaš certifikat je poslat — ${courseName}`,
        heading: 'Certifikat je na putu',
        lines: [
          `Štampani primjerak vašeg certifikata za kurs „${courseName}” je poslat poštom.`,
          `Broj certifikata: ${existing.readable_id}.`,
          // Not "reply to this email": the sender address is send-only.
          `Ako ne stigne u razumnom roku, javite nam se na ${SITE.contact.email}.`,
        ],
        action: { label: 'Pogledaj certifikat', href: `/certificates/${existing.readable_id}` },
      },
    });
  }

  return NextResponse.json({ data: updated });
});
