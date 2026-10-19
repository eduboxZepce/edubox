import { z } from 'zod';
import type { Profile, UpdateUserRequest, UserRole } from './users.schema';

/**
 * The admin's "edit user" form: display name and role.
 *
 * Follows the same pattern as the other form schemas — plain `zod` (not
 * `@/lib/openapi/zod`, which would pull zod-to-openapi into the browser
 * bundle), Serbian messages, and a mapper annotated with the API request type so
 * the two cannot drift.
 *
 * Deactivation is deliberately **not** a field here. It is a single irreversible
 * -feeling switch with its own confirmation, not something to be toggled
 * incidentally while fixing a typo in someone's name.
 */
export const userFormSchema = z.object({
  full_name: z
    .string({ error: 'Ime je obavezno.' })
    .trim()
    .min(1, 'Ime je obavezno.')
    .max(200, 'Ime može imati najviše 200 znakova.'),

  role: z.enum(['admin', 'teacher', 'student'], { error: 'Izaberite ulogu.' }),
});

export type UserFormValues = z.output<typeof userFormSchema>;
export type UserFormInput = z.input<typeof userFormSchema>;

/** Role choices for `<FormSelect>`, labelled to match `USER_ROLE` in status.ts. */
export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Predavač' },
  { value: 'admin', label: 'Administrator' },
];

/** Loads an existing profile into the form. */
export function userToFormValues(profile: Profile): UserFormInput {
  return { full_name: profile.full_name, role: profile.role };
}

/**
 * Form values → `PATCH /api/admin/users/:id` body.
 *
 * Both fields are sent because the form owns both: this dialog is the only
 * place either is edited, so there is no third party whose change could be
 * clobbered. Never widen this to include `deactivated`.
 */
export function toUpdateUserPayload(values: UserFormValues): UpdateUserRequest {
  return {
    full_name: values.full_name,
    role: values.role,
  };
}
