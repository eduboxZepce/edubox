import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

// Every invocation must reach the database — a cached response would let the
// project go idle while the cron still reports success.
export const dynamic = 'force-dynamic';

/**
 * GET /api/keep-alive — called daily by Vercel Cron (`vercel.json`).
 *
 * Supabase pauses a free-tier project after 7 days without database activity.
 * One tiny real query a day keeps it awake.
 *
 * Uses the anon client: `categories` is publicly readable, so the query needs
 * no elevated key, and a cron job that only proves the database is alive has no
 * business holding the service-role one.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`. With `CRON_SECRET` unset
 * every request is refused, rather than accepting the literal "Bearer undefined".
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await createPublicClient().from('categories').select('id').limit(1);

  if (error) {
    console.error('[keep-alive] database query failed', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;

  // Constant-time comparison, so the secret cannot be guessed byte by byte
  // from response timing. timingSafeEqual requires equal lengths.
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
