import { NextResponse } from 'next/server';
import { forbidden, parseBody, unwrapMaybe, unwrapOne, withRoute } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { uuidSchema } from '@/lib/schemas/common.schema';
import { requestDeliverySchema } from '@/lib/schemas/certificates.schema';
import { adminIds, notifyAfterResponse } from '@/lib/services/notifications';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ certificateId: string }> };

/**
 * PATCH /api/certificates/:id/request-delivery — student requests a physical copy.
 *
 * `certificates` grants students SELECT only — there is no student UPDATE
 * policy — so this write must go through the service role. Ownership is
 * confirmed first using the caller's own RLS-scoped client, which can only see
 * their own rows: if that lookup misses, the certificate is not theirs.
 */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  const { userId, profile } = await requireUser();
  const certificateId = uuidSchema.parse((await ctx.params).certificateId);
  const body = await parseBody(req, requestDeliverySchema);

  const supabase = await createClient();
  const owned = unwrapMaybe(
    await supabase
      .from('certificates')
      .select('id')
      .eq('id', certificateId)
      .eq('student_id', userId)
      .maybeSingle(),
  );
  if (!owned) throw forbidden('This certificate does not belong to you');

  const svc = createServiceRoleClient();
  const updated = unwrapOne(
    await svc
      .from('certificates')
      .update({ requested_delivery: body.requested_delivery })
      .eq('id', certificateId)
      .select('*, courses(name)')
      .single(),
  );

  // Only when asking, not when withdrawing: a cancelled request is one fewer
  // thing on the admin's list, which nobody needs an email about.
  if (body.requested_delivery) {
    const courseName = updated.courses?.name ?? 'obuka';
    const href = `/admin/certificates/${certificateId}`;

    notifyAfterResponse({
      userIds: await adminIds(svc),
      type: 'certificate_delivery_requested',
      title: 'Zahtjev za slanje certifikata',
      body: `${profile.full_name} traži štampani certifikat za obuku „${courseName}”.`,
      link: href,
      email: {
        subject: `Zahtjev za slanje certifikata — ${updated.readable_id}`,
        heading: 'Zahtjev za štampani certifikat',
        lines: [
          `${profile.full_name} (${profile.email}) traži da mu/joj se pošalje štampani certifikat za obuku „${courseName}”.`,
          `Broj certifikata: ${updated.readable_id}.`,
          'Nakon slanja označite certifikat kao poslan da zahtjev nestane sa liste.',
        ],
        action: { label: 'Otvori certifikat', href },
      },
    });
  }

  return NextResponse.json({ data: updated });
});
