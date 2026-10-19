import type { SxProps, Theme } from '@mui/material/styles';
import type { UserRole } from '@/lib/auth/routes';

/**
 * The colour a role's chrome is tinted with, so a glance at the top bar says
 * whose eyes you are looking through: purple for an admin, blue for a teacher,
 * plain paper for a student. Same pairing as `USER_ROLE` in `status.ts`, so the
 * bar agrees with the role chips in the users table.
 *
 * Students get no tint on purpose. They are the default audience and the bar a
 * stranger sees on public pages is plain too; the tint exists to mark the
 * *unusual* views — the ones where a click can change what other people see.
 */
const ROLE_TINT: Partial<Record<UserRole, 'primary' | 'secondary'>> = {
  admin: 'secondary',
  teacher: 'primary',
};

export function roleTint(role: UserRole) {
  return ROLE_TINT[role] ?? null;
}

/**
 * Background + bottom edge for a role-tinted surface (the top bar, and the
 * admin sidebar's brand block, which sits level with it).
 *
 * Written as literal CSS variables for the reason given in docs/project-context.md
 * ("Gradients are written as literal CSS variables"): with `cssVariables` on,
 * `palette.secondary.main` is itself a `var(--…)`, so `alpha()` cannot parse it.
 * The tint is layered over `background.paper` rather than replacing it, because
 * the bar is sticky and must stay opaque over scrolled content — in both schemes.
 */
export function roleSurfaceSx(role: UserRole): SxProps<Theme> {
  const tint = roleTint(role);
  if (!tint) return { bgcolor: 'background.paper' };

  const channel = `var(--mui-palette-${tint}-mainChannel)`;
  return {
    background: `linear-gradient(rgb(${channel} / 0.09), rgb(${channel} / 0.09)), var(--mui-palette-background-paper)`,
    borderBottomColor: `rgb(${channel} / 0.35)`,
  };
}
