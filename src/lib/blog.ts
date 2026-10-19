import { BUCKETS, publicUrl } from '@/lib/storage';

/**
 * A blog post, as the public pages render it.
 *
 * ## Where posts live
 *
 * In the `blog_posts` table (migration 0035), written by admins at
 * `/admin/blog`. They used to be a typed array in this file — publishing as a
 * code review — but the people writing posts are not the people with commit
 * access, and every typo fix was a release. Same trade as the legal texts.
 *
 * This module stays client-safe (the index's `<BlogList>` imports it); the
 * reads are in `src/lib/server/blog.ts`, which maps a row into this shape.
 *
 * Deliberately minimal, unchanged from the array: no author, no reading time,
 * no draft flag, no tags. Those are workflow features with no workflow behind
 * them — a post is live the moment it is saved.
 */
export type BlogPost = {
  /**
   * The URL segment, and the post's public identity — `/blog/{slug}`.
   *
   * Lowercase, hyphens, no diacritics: `sta-je-git`, not `što-je-git`. The
   * database derives it from the title on create.
   *
   * **A published slug must never change.** It is an address; changing it
   * breaks inbound links and discards whatever ranking the post earned. Same
   * rule as `courses.slug`.
   */
  slug: string;

  /** The headline. Becomes the `<h1>` and, with a suffix, the `<title>`. */
  title: string;

  /**
   * One or two sentences, roughly 120–160 characters.
   *
   * This is the meta description as well as the index card's summary, so write
   * it for a stranger reading a search result — it is the most SEO-relevant
   * field after the title and the content itself.
   */
  excerpt: string;

  /** ISO date, `2026-08-27`. Orders the index, newest first. */
  publishedAt: string;

  /**
   * Header image, already resolved to a URL — see `blogImageUrl`.
   *
   * An object rather than a bare URL because `alt` is not optional: it is both
   * the accessible name and how the image itself gets indexed. There is no
   * `width`/`height` — the page fixes the aspect ratio in CSS.
   */
  image?: { src: string; alt: string };

  /** Free-text topic, used for the filter pills on the blog index. */
  category?: string;

  /** The article body, in Markdown. */
  content: string;
};

/**
 * The URL for a stored `image_path`.
 *
 * Two kinds of value live in that column. Posts carried over from the old array
 * point at files in `public/` (`/images/blog/…`), which are served as they are;
 * anything uploaded since is an object path in the `blog-images` bucket. The
 * leading slash is what tells them apart — a bucket path never starts with one.
 */
export function blogImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('/') ? path : publicUrl(BUCKETS.blogImages, path);
}

/**
 * Rough reading time from word count (200 wpm), used for the "X MIN"
 * badge. Not stored per post - computed on the fly so it never drifts
 * out of sync with edits to `content`.
 */
export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Unique categories in use, for the filter pills - "Sve teme" is added by the UI. */
export function blogCategories(posts: { category?: string | null }[]): string[] {
  return Array.from(
    new Set(posts.map((post) => post.category).filter((c): c is string => Boolean(c))),
  );
}
