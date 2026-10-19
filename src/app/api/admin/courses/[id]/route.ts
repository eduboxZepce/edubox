import { NextResponse } from 'next/server';
import {
  badRequest,
  forbidden,
  parseBody,
  unwrapMaybe,
  unwrapOne,
  withRoute,
} from '@/lib/api/errors';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { notifyAfterResponse } from '@/lib/services/notifications';
import { updateCourseSchema } from '@/lib/schemas/courses.schema';
import { uuidSchema } from '@/lib/schemas/common.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/courses/:id — any publish state (admin, or the owning teacher). */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  const { userId, profile } = await requireStaff();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();

  // Same reason as the list route: the courses SELECT policy also admits any
  // *published* course, so without this a teacher could open the edit screen
  // of someone else's course — and only find out on save, when RLS refuses.
  // Filtering here makes it a 404, which the admin screens already render as
  // "not found or not yours".
  let q = supabase.from('courses').select('*').eq('id', id);
  if (profile.role === 'teacher') q = q.eq('owner_id', userId);

  const course = unwrapOne(await q.maybeSingle());

  return NextResponse.json({ data: course });
});

/** PATCH /api/admin/courses/:id (admin). */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  const auth = await requireStaff();
  const id = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, updateCourseSchema);

  if (Object.keys(body).length === 0) throw badRequest('No fields to update');

  /*
   * Ownership transfer is an admin act. The database says so too — the column
   * guard raises 42501 for a teacher — but that would surface as a bare
   * "permission denied" with no hint of which field caused it. Checking here
   * turns it into a sentence, and the trigger remains the actual guarantee.
   */
  if (body.owner_id !== undefined && auth.profile.role !== 'admin') {
    throw forbidden('Only an admin may transfer course ownership');
  }

  const supabase = await createClient();

  // Read before write, so the publish transition can be detected. `published`
  // is trigger-guarded (`guard_course_privileged_columns`), so a teacher can
  // never reach the branch below by publishing their own course — which is
  // exactly why the owner needs telling when an admin does it for them.
  const previous = unwrapMaybe(
    await supabase.from('courses').select('published, owner_id').eq('id', id).maybeSingle(),
  );

  const updated = unwrapOne(
    await supabase.from('courses').update(body).eq('id', id).select().single(),
  );

  const justPublished = updated.published && previous && !previous.published;

  if (justPublished && updated.owner_id) {
    notifyAfterResponse({
      userIds: [updated.owner_id],
      type: 'course_published',
      title: 'Vaša obuka je objavljena',
      body: `Obuka „${updated.name}” je objavljena i vidljiva je u katalogu.`,
      link: `/courses/${updated.slug}`,
      email: {
        subject: `Obuka je objavljena — ${updated.name}`,
        heading: 'Vaša obuka je objavljena',
        lines: [
          `Administrator je objavio obuku „${updated.name}”. Sada je vidljiva u javnom katalogu i studenti mogu tražiti pristup.`,
        ],
        action: { label: 'Pogledaj obuku', href: `/courses/${updated.slug}` },
      },
    });
  }

  return NextResponse.json({ data: updated });
});

/** DELETE /api/admin/courses/:id (admin). Cascades to modules and their content. */
export const DELETE = withRoute(async (_req, ctx: Ctx) => {
  await requireStaff();
  const id = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  unwrapOne(await supabase.from('courses').delete().eq('id', id).select('id').single());

  return new NextResponse(null, { status: 204 });
});
