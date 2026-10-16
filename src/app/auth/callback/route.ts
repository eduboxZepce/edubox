import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { landingPathForRole } from '@/store/useAuthStore';

/**
 * Supabase email-confirmation / magic-link / recovery callback.
 *
 * Not under `(auth)` — this is a plain route handler, not a page, and it sits
 * at the literal `/auth/callback` path Supabase requires.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    // An OAuth provider reports failure (the user cancelled on Google's consent
    // screen, a banned account, a misconfigured provider) as `?error=…` instead
    // of a code. Kept distinct from a malformed link so the login page can say so.
    const reason = searchParams.get('error') ? 'oauth_failed' : 'missing_code';
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_or_expired_link`);
  }

  // A recovery link lands here too; `next` lets the reset flow continue to the
  // password form instead of the role landing page.
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };

  return NextResponse.redirect(`${origin}${landingPathForRole(profile?.role)}`);
}
