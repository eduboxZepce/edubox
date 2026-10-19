import { notFound, unwrapMaybe, withRoute } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { renderCertificatePdf } from '@/lib/pdf/certificate';
import { formatDate } from '@/lib/format';
import { publicEnv } from '@/lib/env';
import { surnameOf, verificationHref } from '@/lib/certificateVerification';
import { z } from '@/lib/openapi/zod';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ certificateId: string }> };

/**
 * GET /api/certificates/:id/pdf — the certificate as an A4 PDF.
 *
 * ## Private, matching the page it belongs to
 *
 * Same access model as `GET /api/certificates/:id`: signed in, on the caller's
 * own client, so RLS admits only the student, admins and the owning teacher.
 * (It was briefly public; see "Certificates are private" in docs/project-context.md.)
 *
 * The document carries a QR code and a printed link to the **public** check,
 * `/provjera-certifikata`, with number and surname filled in — that is how a
 * stranger holding a printed copy confirms it without an account.
 *
 * ## Inline by default, attachment on request
 *
 * `?download=1` flips `Content-Disposition`. The page previews the same URL
 * inline in a canvas viewer and links to the download variant, so one route
 * serves both and they cannot drift apart.
 */
export const GET = withRoute(async (req, ctx: Ctx) => {
  await requireUser();
  const { certificateId } = await ctx.params;

  const supabase = await createClient();
  const isUuid = z.uuid().safeParse(certificateId).success;

  const certificate = unwrapMaybe(
    await supabase
      .from('certificates')
      .select(
        'readable_id, created_at, courses(name), profiles!certificates_student_id_fkey(full_name)',
      )
      .eq(isUuid ? 'id' : 'readable_id', certificateId)
      .maybeSingle(),
  );

  if (!certificate) throw notFound('No certificate found for that identifier');

  const studentName = certificate.profiles?.full_name ?? '—';

  const pdf = await renderCertificatePdf({
    readableId: certificate.readable_id,
    studentName,
    courseName: certificate.courses?.name ?? '—',
    issuedAt: formatDate(certificate.created_at),
    // The public check, not `/certificates/…`: that page is private, so a
    // stranger scanning the code would only have met a login form.
    verifyUrl: `${publicEnv.siteUrl}${verificationHref(certificate.readable_id, surnameOf(studentName))}`,
  });

  const download = new URL(req.url).searchParams.get('download') !== null;

  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${certificate.readable_id}.pdf"`,
      // Private, and not cached by anything in between: the response now
      // depends on who asked for it.
      'Cache-Control': 'private, no-store',
    },
  });
});
