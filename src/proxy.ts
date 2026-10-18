import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';
import { landingPathForRole } from '@/lib/auth/routes';
import { isDisabledRoute } from '@/lib/features';

/**
 * Route protection.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next.js 16 renamed the convention and
 * the function must be exported as `proxy`. The behaviour is unchanged from
 * middleware — this is the same file the build spec calls `middleware.ts`.
 *
 * Route groups like `(student)` never appear in a URL, so protection is keyed
 * on concrete path prefixes instead. Keep these in sync when adding pages to a
 * protected group.
 */
// `/notifications` and `/settings` are the `(account)` group: signed-in, any
// role. They are listed here and *not* in ADMIN_PREFIXES, which is the whole
// distinction between the two lists.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/notifications',
  '/settings',
  '/certificates',
  '/issues',
] as const;
const AUTH_PAGES = ['/login', '/register'] as const;

/**
 * The `/admin` prefix is open to admins *and* teachers — see the role check
 * below. The constant keeps its name because it still marks the same URL
 * subtree; only the set of roles allowed through has widened.
 *
 * `/api-docs` and `/api/openapi.json` are deliberately absent here: the docs
 * are public for now, at the project owner's request. The API docs spec's
 * guardrail recommends keeping them admin- or dev-only, so re-add both prefixes
 * to close them again.
 *
 * Note the two must stay together — the docs page fetches the spec from the
 * browser, so gating only the JSON leaves a page that renders nothing.
 */
const ADMIN_PREFIXES = ['/admin'] as const;

const startsWithAny = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  // This response object is what carries refreshed auth cookies back to the
  // browser. It must be the one returned, or the session silently fails to
  // refresh and the user is logged out on token expiry.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token against the auth server. getSession() would
  // trust the cookie as-is, which is not good enough to gate a route on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /*
   * A switched-off feature's URLs stop resolving, not just its links.
   *
   * Hiding a nav entry is presentation; during a staged demo a bookmark or a
   * typed address would otherwise walk straight into a section that is meant to
   * be weeks away. 404 rather than redirect, because as far as this build is
   * concerned the page does not exist — a redirect would advertise that it does.
   *
   * This is deliberately *not* access control: the API routes and RLS are
   * untouched, and a flag protects nothing. See `src/lib/features.ts`.
   */
  if (isDisabledRoute(pathname, { signedIn: Boolean(user) })) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  const isProtected = startsWithAny(pathname, PROTECTED_PREFIXES);
  const isAdminOnly = startsWithAny(pathname, ADMIN_PREFIXES);
  const isAuthPage = startsWithAny(pathname, AUTH_PAGES);

  if (!user) {
    if (isProtected || isAdminOnly) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      // Preserve where they were headed so login can return them there.
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Signed in: role is only needed for the admin-gated paths and for deciding
  // where to bounce someone off the auth pages.
  if (isAdminOnly || isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // Teachers share the /admin shell with admins. What they can see inside is
    // narrowed by the nav (role-filtered) and by RLS (`courses.owner_id`); this
    // check only decides who may enter the section at all. The group layout
    // repeats it server-side as the authoritative test.
    const isStaff = profile?.role === 'admin' || profile?.role === 'teacher';

    if (isAdminOnly && !isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (isAuthPage) {
      // Already signed in — send them where their role belongs rather than
      // showing a login form they don't need.
      const url = request.nextUrl.clone();
      url.pathname = landingPathForRole(profile?.role);
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Skip static assets and image optimisation so auth logic never blocks CSS,
  // JS or images. `/api/openapi.json` is matched explicitly because the general
  // `api` exclusion would otherwise skip it. `api/keep-alive` is the daily cron:
  // it carries no session and checks its own secret, so it skips the auth round
  // trip entirely.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/keep-alive|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
