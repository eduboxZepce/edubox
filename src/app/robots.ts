import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';

/**
 * GET /robots.txt
 *
 * Tells crawlers what not to spend time on. It is **not** access control: a
 * disallowed URL is still reachable, and the pages behind sign-in are protected
 * by `proxy.ts` and their layouts, not by this file.
 *
 * The private list mirrors `PROTECTED_PREFIXES` in `proxy.ts`, plus the URLs
 * that are public to reach but pointless to index: the API, the auth callback,
 * the password flow, and the module pages under a course (gated content, which
 * `checkModulePageAccess` turns away). Those also carry a `noindex` tag, which
 * is what actually keeps a URL out of results if something links to it.
 *
 * A preview deployment disallows everything; see `publicEnv.isIndexable`.
 */
export default function robots(): MetadataRoute.Robots {
  if (!publicEnv.isIndexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/api-docs',
        '/auth/',
        '/admin',
        '/dashboard',
        '/notifications',
        '/settings',
        '/certificates',
        '/issues',
        '/forgot-password',
        '/reset-password',
        '/courses/*/modules/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
