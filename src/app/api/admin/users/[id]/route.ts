import { NextResponse } from 'next/server';
import {
  ApiError,
  badRequest,
  parseBody,
  unwrapMaybe,
  unwrapOne,
  withRoute,
} from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { notifyAfterResponse } from '@/lib/services/notifications';
import { landingPathForRole } from '@/lib/auth/routes';
import { USER_ROLE } from '@/lib/status';
import { updateUserSchema } from '@/lib/schemas/users.schema';
import { uuidSchema } from '@/lib/schemas/common.schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Supabase expects a duration string, not a flag. There is no "forever", so
 * this is simply a very long ban (~100 years); `'none'` lifts it.
 */
const BAN_FOREVER = '876000h';

/** GET /api/admin/users/:id — one profile (admin). */
export const GET = withRoute(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const userId = uuidSchema.parse((await ctx.params).id);

  const supabase = await createClient();
  const profile = unwrapOne(
    await supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  );

  return NextResponse.json({ data: profile });
});

/**
 * PATCH /api/admin/users/:id — rename, change role, deactivate/reactivate.
 *
 * Profile columns go through the RLS client: admins already have full access to
 * `profiles`, and the `prevent_unauthorized_role_change` trigger (0003) is a
 * second check that the caller really is an admin.
 *
 * ## Deactivation uses two systems, in this order
 *
 * Enforcement lives in Supabase Auth — banning the user blocks sign-in where
 * sign-in happens, so no RLS policy has to be taught about it. `deactivated_at`
 * on the profile is a mirror, because `auth.users` is not exposed through
 * PostgREST and the admin screens would otherwise have no way to show or filter
 * who is disabled.
 *
 * The ban is applied **first**. If the mirroring update then fails, the account
 * is locked out while the profile still reads "active" — visibly wrong, but
 * safe. The reverse order would leave a profile marked deactivated for someone
 * who can still sign in, which is a lie in the dangerous direction.
 *
 * Banning needs the Admin API, hence the service-role client — which performs
 * no authorization of its own, so `requireAdmin()` above is what protects it.
 */
export const PATCH = withRoute(async (req, ctx: Ctx) => {
  const admin = await requireAdmin();
  const userId = uuidSchema.parse((await ctx.params).id);
  const body = await parseBody(req, updateUserSchema);

  if (Object.keys(body).length === 0) throw badRequest('No fields to update');

  // Guard against an admin locking themselves out. Renaming yourself is fine;
  // removing your own admin role or disabling your own account is not, because
  // nothing in the UI could undo it afterwards.
  if (userId === admin.userId) {
    if (body.role !== undefined && body.role !== 'admin') {
      throw badRequest('You cannot remove your own admin role');
    }
    if (body.deactivated === true) {
      throw badRequest('You cannot deactivate your own account');
    }
  }

  if (body.deactivated !== undefined) {
    const service = createServiceRoleClient();
    const { error } = await service.auth.admin.updateUserById(userId, {
      ban_duration: body.deactivated ? BAN_FOREVER : 'none',
    });

    // Surfaced as a 500 rather than swallowed: reporting success here would
    // claim an account is disabled when it is still able to sign in.
    if (error) {
      throw new ApiError(500, `Could not change the account's sign-in status: ${error.message}`);
    }
  }

  const patch = {
    ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(body.deactivated !== undefined
      ? { deactivated_at: body.deactivated ? new Date().toISOString() : null }
      : {}),
  };

  const supabase = await createClient();
  const previous = unwrapMaybe(
    await supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  );

  const updated = unwrapOne(
    await supabase.from('profiles').update(patch).eq('id', userId).select().single(),
  );

  // Only on an actual change of role, and never on a rename or a deactivation.
  // A promotion to teacher is the case that matters: it grants abilities the
  // person has no other way of discovering. Deactivation is deliberately silent
  // — the account cannot sign in, so `notifyUsers` would skip it anyway.
  if (body.role !== undefined && previous && previous.role !== body.role) {
    notifyAfterResponse({
      userIds: [userId],
      type: 'account_role_changed',
      title: 'Uloga naloga je promijenjena',
      body: `Vaša uloga je sada: ${USER_ROLE[updated.role].label}.`,
      link: landingPathForRole(updated.role),
      email: {
        subject: 'Promijenjena je uloga vašeg naloga',
        heading: 'Uloga naloga je promijenjena',
        lines: [
          `Administrator je promijenio ulogu vašeg naloga na: ${USER_ROLE[updated.role].label}.`,
          updated.role === 'teacher'
            ? 'Sada možete kreirati i uređivati vlastite obuke, module, kvizove i zadatke te pregledati predana rješenja.'
            : 'Promjena važi odmah, bez ponovne prijave.',
        ],
        action: { label: 'Otvori nalog', href: landingPathForRole(updated.role) },
      },
    });
  }

  return NextResponse.json({ data: updated });
});
