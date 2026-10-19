import { NextResponse } from 'next/server';
import { parseBody, parseQuery, unwrapMany, unwrapOne, withRoute } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { revalidateBlog } from '@/lib/server/blog';
import { metaFor, rangeFor } from '@/lib/schemas/common.schema';
import { createBlogPostSchema, listBlogPostsQuerySchema } from '@/lib/schemas/blog.schema';

export const dynamic = 'force-dynamic';

/** Everything but `content`, which is the bulk of a row and never shown in the list. */
const SUMMARY_COLUMNS =
  'id, slug, title, excerpt, category, published_at, image_path, image_alt, created_at, updated_at, created_by, updated_by';

/**
 * GET /api/admin/blog-posts — the admin list, newest first.
 *
 * Admin-only although the rows are public: this is the management screen's
 * endpoint, and the public pages read on the server instead.
 */
export const GET = withRoute(async (req) => {
  await requireAdmin();
  const query = parseQuery(req, listBlogPostsQuerySchema);
  const [from, to] = rangeFor(query);

  const supabase = await createClient();
  let q = supabase.from('blog_posts').select(SUMMARY_COLUMNS, { count: 'exact' });

  if (query.search) {
    // Commas and parentheses would break PostgREST's `or` syntax.
    const term = query.search.replace(/[,()]/g, ' ');
    q = q.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,category.ilike.%${term}%`);
  }

  const result = await q
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  return NextResponse.json({ data: unwrapMany(result), meta: metaFor(query, result.count ?? 0) });
});

/**
 * POST /api/admin/blog-posts — create a post (admin). Live immediately: there
 * is no draft state.
 *
 * The slug is not accepted on create; the database derives it from the title.
 * A duplicate title therefore gets `-2`, never a 409.
 */
export const POST = withRoute(async (req) => {
  const { userId } = await requireAdmin();
  const body = await parseBody(req, createBlogPostSchema);

  const supabase = await createClient();
  const created = unwrapOne(
    await supabase
      .from('blog_posts')
      .insert({ ...body, created_by: userId, updated_by: userId })
      .select()
      .single(),
  );

  revalidateBlog(created.slug);
  return NextResponse.json({ data: created }, { status: 201 });
});
