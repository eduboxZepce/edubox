import type { NextConfig } from 'next';

/**
 * A Vercel build must never publish `localhost` as the site's address.
 *
 * `.env.example` ships `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local
 * work, and copying it into Vercel is an easy mistake — production then served
 * a canonical URL, sitemap, `robots.txt` line, share image and JSON-LD all on
 * `http://localhost:3000`. Google cannot fetch any of that, so the search
 * result had no site name, no favicon and no image; worse, auth redirects and
 * the links in emails pointed at the reader's own machine.
 *
 * So on Vercel a localhost value is discarded (with a build-log warning), and
 * `publicEnv.siteUrl` falls through to `SITE.url` on production and to the
 * deployment's own URL on previews. `NEXT_PUBLIC_*` values are inlined after
 * this file is loaded, so editing `process.env` here is early enough.
 *
 * The same block backfills `NEXT_PUBLIC_VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_URL`
 * from Vercel's unprefixed system variables, which always exist at build time,
 * because the prefixed copies only appear when "Automatically expose System
 * Environment Variables" is on — and the site URL and the preview `noindex`
 * both depend on them.
 */
if (process.env.VERCEL_ENV) {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(process.env.NEXT_PUBLIC_SITE_URL ?? '')) {
    console.warn(
      `[next.config] Ignoring NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL} on Vercel. ` +
        'Remove it from the Vercel project settings, or set it to the real domain.',
    );
    delete process.env.NEXT_PUBLIC_SITE_URL;
  }
  process.env.NEXT_PUBLIC_VERCEL_ENV ??= process.env.VERCEL_ENV;
  if (process.env.VERCEL_URL) process.env.NEXT_PUBLIC_VERCEL_URL ??= process.env.VERCEL_URL;
}

/**
 * The public buckets `next/image` renders from — course thumbnails and blog
 * images — so it may resize them and serve WebP. Only those buckets: allowing
 * the whole Supabase host would let anyone route arbitrary objects through the
 * optimiser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const imagePatterns = supabaseUrl
  ? ['course-thumbnails', 'blog-images'].map(
      (bucket) => new URL(`${supabaseUrl}/storage/v1/object/public/${bucket}/**`),
    )
  : [];

const nextConfig: NextConfig = {
  /**
   * The certificate PDF route reads two vendored `.ttf` files at runtime.
   *
   * Nothing imports them, so Next's dependency tracing cannot see them and
   * would leave them out of a production build — the route then works in `next
   * dev` and 500s once deployed. Naming the directory here is the documented
   * fix (`output.md` in the Next docs).
   */
  outputFileTracingIncludes: {
    '/api/certificates/[certificateId]/pdf': ['./src/lib/pdf/fonts/**/*'],
  },

  images: { remotePatterns: imagePatterns },

  /**
   * One canonical host: the apex domain answers with a 301 to `www`, path and
   * query intact, so links and search results converge on one address. Matches
   * `SITE.url`. HTTP → HTTPS needs no rule — Vercel redirects it for every
   * domain itself. Adding the apex as a redirect domain in Vercel's dashboard
   * does the same job; this keeps it in the repo either way.
   */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'edubox-zepce.ba' }],
        destination: 'https://www.edubox-zepce.ba/:path*',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
