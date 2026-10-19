import type { MetadataRoute } from 'next';
import { FEATURES } from '@/lib/features';
import { absoluteUrl } from '@/lib/seo';
import { listBlogSlugs } from '@/lib/server/blog';
import { listPublishedCourses } from '@/lib/server/courses';

/**
 * GET /sitemap.xml — every page a stranger can read.
 *
 * Follows the feature flags: a section that is switched off returns 404, and a
 * sitemap listing 404s teaches a crawler to distrust the rest of it.
 *
 * Revalidated hourly, so a newly published course appears without a deploy.
 * Blog writes revalidate it immediately (`revalidateBlog`).
 *
 * `priority` and `changeFrequency` are left out on purpose: Google has said it
 * ignores both. `lastModified` is the field it does use, so it is given only
 * where it is real — a guessed date is worse than none.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/kontakt') },
    { url: absoluteUrl('/uvjeti-koristenja') },
    { url: absoluteUrl('/politika-privatnosti') },
  ];

  if (FEATURES.catalog) {
    const courses = await listPublishedCourses();
    pages.push(
      { url: absoluteUrl('/courses') },
      ...courses.map((course) => ({
        url: absoluteUrl(`/courses/${course.slug}`),
        lastModified: course.updated_at,
      })),
    );
  }

  if (FEATURES.certificates) pages.push({ url: absoluteUrl('/provjera-certifikata') });

  if (FEATURES.blog) {
    pages.push(
      { url: absoluteUrl('/blog') },
      ...(await listBlogSlugs()).map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updated_at,
      })),
    );
  }

  return pages;
}
