import type { NextConfig } from 'next';

/**
 * The public bucket course thumbnails are served from, so `next/image` may
 * resize them and serve WebP. Only that bucket: allowing the whole Supabase host
 * would let anyone route arbitrary objects through the optimiser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const thumbnailPattern = supabaseUrl
  ? [new URL(`${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/course-thumbnails/**`)]
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

  images: { remotePatterns: thumbnailPattern },

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
