import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/api/cronAuth';
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
 * Vercel sends `Authorization: Bearer $CRON_SECRET` (`isCronAuthorized`).
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await createPublicClient().from('categories').select('id').limit(1);

  if (error) {
    console.error('[keep-alive] database query failed', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
