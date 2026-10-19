import { NextResponse } from 'next/server';
import { parseBody, unwrapOne, withRoute } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { revalidateBlog } from '@/lib/server/blog';
import { uuidSchema } from '@/lib/schemas/common.schema';
import { updateBlogPostSchema } from '@/lib/schemas/blog.schema';
import { BUCKETS } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blog-posts/:id — one post with its content, for the editor (admin). */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  const post = unwrapOne(await supabase.from('blog_posts').select('*').eq('id', id).single());

  return NextResponse.json({ data: post });
});

/**
 * PATCH /api/admin/blog-posts/:id (admin).
 *
 * `slug: ''` regenerates the address from the current title; any other value is
 * stored as given, and a duplicate is a 409 from the unique index.
 */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  const { userId } = await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, updateBlogPostSchema);

  const supabase = await createClient();
  // The old address too: a slug change leaves a cached page at it.
  const before = unwrapOne(await supabase.from('blog_posts').select('slug').eq('id', id).single());
  const updated = unwrapOne(
    await supabase
      .from('blog_posts')
      .update({ ...body, updated_by: userId })
      .eq('id', id)
      .select()
      .single(),
  );

  revalidateBlog(before.slug, updated.slug);
  return NextResponse.json({ data: updated });
});

/**
 * DELETE /api/admin/blog-posts/:id (admin).
 *
 * Also empties the post's `blog-images/{id}/` folder — the cover and anything
 * pasted into the body. That is best effort and runs after the row is gone: a
 * storage failure leaves orphaned images (harmless, and visible in the bucket),
 * never a post whose images vanished while it is still live.
 */
export const DELETE = withRoute(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  const deleted = unwrapOne(
    await supabase.from('blog_posts').delete().eq('id', id).select('slug').single(),
  );

  revalidateBlog(deleted.slug);

  const bucket = supabase.storage.from(BUCKETS.blogImages);
  const { data: objects, error: listError } = await bucket.list(id, { limit: 1000 });
  if (listError) {
    console.error('[blog] Could not list images of deleted post', id, listError.message);
  } else if (objects.length > 0) {
    const { error } = await bucket.remove(objects.map((object) => `${id}/${object.name}`));
    if (error) console.error('[blog] Could not remove images of deleted post', id, error.message);
  }

  return new NextResponse(null, { status: 204 });
});
