import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/**
 * True when a request carries Vercel Cron's `Authorization: Bearer $CRON_SECRET`.
 *
 * With `CRON_SECRET` unset every request is refused, rather than accepting the
 * literal "Bearer undefined".
 */
export function isCronAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;

  // Constant-time comparison, so the secret cannot be guessed byte by byte
  // from response timing. timingSafeEqual requires equal lengths.
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
