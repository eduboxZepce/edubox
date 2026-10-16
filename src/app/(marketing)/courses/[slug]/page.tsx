import CoursePageView from '@/components/courses/CoursePageView';
import JsonLd from '@/components/seo/JsonLd';
import {
  NO_INDEX,
  absoluteUrl,
  metaDescription,
  organizationJsonLd,
  pageMetadata,
} from '@/lib/seo';
import { getPublishedCourse, type PublicCourseSummary } from '@/lib/server/courses';
import { SITE } from '@/lib/siteConfig';
import { courseThumbnailUrl } from '@/lib/storage';

/**
 * `/courses/{slug}` — the course page.
 *
 * ## Why this is split in two
 *
 * What the page *shows* depends on who is signed in (locked syllabus and price,
 * or progress), so the body — `<CoursePageView>` — is a Client Component. What a
 * search engine or a link preview *reads* must not depend on that and must be
 * in the server HTML, so this Server Component owns it: the title, description,
 * canonical URL, share image and `Course` structured data.
 *
 * Both read the same course; this side uses the anonymous client, so a draft
 * never gets public metadata — even when the person loading it is the admin
 * previewing it.
 */
/** Below this, a course's own description is too thin for a search snippet. */
const MIN_AUTHORED_DESCRIPTION = 70;

export async function generateMetadata(props: PageProps<'/courses/[slug]'>) {
  const { slug } = await props.params;
  const course = await getPublishedCourse(slug);

  // Unknown or unpublished. The body still renders (staff may be previewing a
  // draft, and it shows its own "not found" otherwise), but nothing here may be
  // indexed.
  if (!course) return { title: 'Kurs', robots: NO_INDEX };

  const thumbnail = courseThumbnailUrl(course.thumbnail_path);
  // The author's own description when it is long enough to be a search snippet;
  // a one-liner ("Kurs o Gitu.") wastes the space, so it gets the template.
  const authored = metaDescription(course.description);

  return pageMetadata({
    title: course.name,
    description:
      authored && authored.length >= MIN_AUTHORED_DESCRIPTION
        ? authored
        : metaDescription(
            `Online kurs „${course.name}“ na platformi ${SITE.name}: video lekcije, materijali, zadaci i certifikat po završetku.`,
          )!,
    path: `/courses/${course.slug}`,
    image: thumbnail ? { url: thumbnail, alt: course.name } : null,
  });
}

/**
 * schema.org `Course`. The offer and the course instance are what make a course
 * eligible for Google's course listings; both describe facts the page already
 * shows (price in KM, studied online).
 */
function courseJsonLd(course: PublicCourseSummary) {
  const url = absoluteUrl(`/courses/${course.slug}`);
  const thumbnail = courseThumbnailUrl(course.thumbnail_path);

  return {
    '@type': 'Course',
    name: course.name,
    description: metaDescription(course.description, 500) ?? course.name,
    url,
    inLanguage: 'bs',
    ...(thumbnail && { image: thumbnail }),
    provider: organizationJsonLd(),
    offers: {
      '@type': 'Offer',
      category: course.price > 0 ? 'Paid' : 'Free',
      price: course.price,
      priceCurrency: 'BAM',
      url,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
    },
  };
}

export default async function CoursePage(props: PageProps<'/courses/[slug]'>) {
  const { slug } = await props.params;
  // Cached: `generateMetadata` already made this call during this render.
  const course = await getPublishedCourse(slug);

  return (
    <>
      {course && <JsonLd data={courseJsonLd(course)} />}
      <CoursePageView slug={slug} />
    </>
  );
}
