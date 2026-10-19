import { NextResponse } from 'next/server';
import { ApiError, notFound, parseBody, unwrapMaybe, withRoute } from '@/lib/api/errors';
import { clientIp, createRateLimiter } from '@/lib/api/rateLimit';
import {
  CERTIFICATE_NUMBER_PATTERN,
  normalizeCertificateNumber,
  surnameMatches,
} from '@/lib/certificateVerification';
import { verifyCertificateRequestSchema } from '@/lib/schemas/certificates.schema';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

/** Ten wrong guesses per IP per 15 minutes. Successful checks are not counted. */
const misses = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

const NO_MATCH =
  'Nismo pronašli certifikat s tim brojem i prezimenom. Provjerite oba podatka i pokušajte ponovo.';

/**
 * POST /api/certificates/verify — the public certificate check.
 *
 * ## Why this is separate from `GET /api/certificates/:id`
 *
 * That route is private: it runs on the caller's own client and RLS limits it
 * to the student, admins and the owning teacher. This one is for strangers, so
 * it uses the service-role client — `certificates` grants `anon` nothing — and
 * **the route is the access control**. What keeps that safe:
 *
 *   - a fixed projection of four facts (number, name, course, date), never
 *     the row;
 *   - a match on number **and** surname, so sequential numbers cannot be walked
 *     into a list of graduates (see `src/lib/certificateVerification.ts`);
 *   - one answer for "no such number" and "wrong surname", so a miss does not
 *     confirm that a number exists;
 *   - a cap on misses per IP (best effort, see `rateLimit.ts`).
 *
 * POST rather than GET so a surname never lands in access logs or the browser
 * history as a query string. The page's shareable link does carry both, but
 * that is the holder's choice to publish.
 *
 * Not behind the `certificates` feature flag: flags hide UI, they do not gate
 * the API (§7 of docs/project-context.md).
 */
export const POST = withRoute(async (req) => {
  const ip = clientIp(req);
  if (misses.isLimited(ip)) {
    throw new ApiError(429, 'Previše neuspješnih pokušaja. Pokušajte ponovo za 15 minuta.');
  }

  const body = await parseBody(req, verifyCertificateRequestSchema);
  const number = normalizeCertificateNumber(body.number);

  const miss = () => {
    misses.hit(ip);
    return notFound(NO_MATCH);
  };

  if (!CERTIFICATE_NUMBER_PATTERN.test(number)) throw miss();

  const supabase = createServiceRoleClient();
  const certificate = unwrapMaybe(
    await supabase
      .from('certificates')
      .select(
        'readable_id, created_at, courses(name), profiles!certificates_student_id_fkey(full_name)',
      )
      .eq('readable_id', number)
      .maybeSingle(),
  );

  const fullName = certificate?.profiles?.full_name;
  if (!certificate || !fullName || !surnameMatches(fullName, body.surname)) throw miss();

  return NextResponse.json({
    data: {
      readable_id: certificate.readable_id,
      student_name: fullName,
      // `course_id` cascades on delete, so a certificate never outlives its
      // course; the fallback is only for the type.
      course_name: certificate.courses?.name ?? '—',
      issued_at: certificate.created_at,
      valid: true,
    },
  });
});
