import 'server-only';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';
import { blogImageUrl, type BlogPost } from '@/lib/blog';
import type { Tables } from '@/types/database.types';

/**
 * Server-side reads of the blog, for the public pages and the sitemap.
 *
 * Through `createPublicClient()` (anon key, no cookies), like the course
 * metadata: reading cookies would make the pages dynamic, and the blog is meant
 * to be static HTML a crawler reads without running anything. The pages are
 * ISR — rendered once, then refreshed by `revalidatePath` from the admin write
 * routes (`revalidateBlog`), with an hourly fallback.
 *
 * Errors are logged and read as "no posts" rather than thrown: an outage should
 * leave the blog empty, not take the marketing layout down with a 500.
 */

type BlogPostRow = Tables<'blog_posts'>;

const COLUMNS = 'slug, title, excerpt, category, published_at, image_path, image_alt, content';

/** A row in the shape the public components already render. */
function toBlogPost(
  row: Pick<
    BlogPostRow,
    | 'slug'
    | 'title'
    | 'excerpt'
    | 'category'
    | 'published_at'
    | 'image_path'
    | 'image_alt'
    | 'content'
  >,
): BlogPost {
  const src = blogImageUrl(row.image_path);

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    // The table guarantees alt text whenever there is an image (0035).
    image: src ? { src, alt: row.image_alt ?? '' } : undefined,
    category: row.category ?? undefined,
    content: row.content,
  };
}

/** Every post, newest first. */
export async function listBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await createPublicClient()
    .from('blog_posts')
    .select(COLUMNS)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[blog] Failed to list posts', error.message);
    return [];
  }
  return data.map(toBlogPost);
}

/**
 * One post by slug, or `null`.
 *
 * Wrapped in `cache()` because `generateMetadata` and the page both call it
 * during one render; the second call reuses the first result.
 */
export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await createPublicClient()
    .from('blog_posts')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[blog] Failed to read post', error.message);
    return null;
  }
  return data ? toBlogPost(data) : null;
});

/** Slugs and edit dates, for `generateStaticParams` and the sitemap. */
export async function listBlogSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await createPublicClient().from('blog_posts').select('slug, updated_at');

  if (error) {
    console.error('[blog] Failed to list slugs', error.message);
    return [];
  }
  return data;
}

/**
 * Marks the blog stale after an admin write, so the next visit renders fresh:
 * the index, the sitemap, and every post.
 *
 * The posts are revalidated twice over. The route pattern covers every post —
 * the index's category pills depend on all of them — but on its own it was
 * measured to leave an edited post serving its old HTML; the literal path of
 * each slug the write touched (both, on a slug change) is what makes the
 * change visible on the very next request.
 *
 * A Route Handler's `revalidatePath` only marks: nothing re-renders until
 * someone visits, so this is cheap however many posts there are.
 */
export function revalidateBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');
}
