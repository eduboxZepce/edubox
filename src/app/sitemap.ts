import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { listBlogSlugs } from '@/lib/server/blog';
import { listPublishedCourses } from '@/lib/server/courses';

/**
 * GET /sitemap.xml — every page a stranger can read.
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

  const courses = await listPublishedCourses();
  pages.push(
    { url: absoluteUrl('/courses') },
    ...courses.map((course) => ({
      url: absoluteUrl(`/courses/${course.slug}`),
      lastModified: course.updated_at,
    })),
  );

  pages.push({ url: absoluteUrl('/provjera-certifikata') });

  pages.push(
    { url: absoluteUrl('/blog') },
    ...(await listBlogSlugs()).map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated_at,
    })),
  );

  return pages;
}
