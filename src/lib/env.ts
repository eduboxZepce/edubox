import { SITE } from '@/lib/siteConfig';

/**
 * Env access with a fail-fast check, so a missing variable surfaces as a clear
 * error at the call site instead of `undefined` reaching the Supabase SDK.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they must be referenced
 * as full literal property accesses — never `process.env[someVar]`.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and populate it.`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseAnonKey() {
    return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  /**
   * The app's own origin, without a trailing slash: auth redirects, links in
   * emails and notifications, the certificate's verification line.
   *
   * Resolution order, so each environment needs as little as possible:
   * 1. `NEXT_PUBLIC_SITE_URL` — set it for **Production** (the custom domain).
   * 2. `SITE.url` on a Vercel **Production** build. Without this, a forgotten
   *    variable would make every canonical URL, sitemap entry and share image
   *    point at the deployment's `*.vercel.app` alias.
   * 3. `NEXT_PUBLIC_VERCEL_URL` — Vercel provides this per deployment, so a
   *    **Preview** deployment links to itself rather than to production. Leave
   *    `NEXT_PUBLIC_SITE_URL` unset for Preview to get this.
   * 4. `http://localhost:3000` — local development.
   */
  get siteUrl() {
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
    const url =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? SITE.url : '') ||
      (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000');
    return url.replace(/\/$/, '');
  },
  /**
   * Whether search engines may index this deployment.
   *
   * False on Vercel Preview and Development deployments, which serve the same
   * pages at throwaway `*.vercel.app` addresses — indexed, they would compete
   * with the real site as duplicate content. `NEXT_PUBLIC_VERCEL_ENV` is set by
   * Vercel itself, so nothing needs configuring; anywhere else (local, another
   * host) it is absent and indexing is allowed.
   */
  get isIndexable() {
    const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    return vercelEnv === undefined || vercelEnv === 'production';
  },
};

/**
 * Server-only. Reading this from a client bundle throws at module scope, which
 * is the point — it makes an accidental client import a build/runtime failure
 * rather than a silent key leak.
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  },
};
