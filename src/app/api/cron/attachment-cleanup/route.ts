import { NextResponse, type NextRequest } from 'next/server';
import { isCronAuthorized } from '@/lib/api/cronAuth';
import { cleanUpApprovedAttachments } from '@/lib/services/attachmentCleanup';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/attachment-cleanup — called daily by Vercel Cron (`vercel.json`).
 *
 * Frees storage by deleting attachments on submissions approved more than a
 * week ago; see `cleanUpApprovedAttachments` for the rule. Like
 * `/api/keep-alive` it carries no session and checks its own secret, so the
 * proxy skips it (`api/cron` in the matcher).
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { deleted } = await cleanUpApprovedAttachments();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error('[attachment-cleanup]', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
