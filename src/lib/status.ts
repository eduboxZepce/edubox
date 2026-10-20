import type { PurchaseStatus } from '@/lib/schemas/purchases.schema';
import type { IssueStatus } from '@/lib/schemas/issues.schema';
import type { TaskSubmissionStatus } from '@/lib/schemas/task-submissions.schema';
import type { UserRole } from '@/lib/schemas/users.schema';

/**
 * Status → label + colour, in one place.
 *
 * The database stores English enum values; the UI shows Serbian. Mapping them
 * here means no page invents its own wording, and a status renaming is a
 * one-line change rather than a search across the codebase.
 *
 * Used as `<StatusChip {...PURCHASE_STATUS[purchase.status]} />`.
 */
export type StatusDisplay = {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
};

export const PURCHASE_STATUS: Record<PurchaseStatus, StatusDisplay> = {
  requested: { label: 'Na čekanju', color: 'warning' },
  approved: { label: 'Odobreno', color: 'success' },
  denied: { label: 'Odbijeno', color: 'error' },
  revoked: { label: 'Opozvano', color: 'default' },
};

export const SUBMISSION_STATUS: Record<TaskSubmissionStatus, StatusDisplay> = {
  pending: { label: 'Čeka pregled', color: 'warning' },
  needs_revision: { label: 'Potrebna izmjena', color: 'info' },
  approved: { label: 'Prihvaćeno', color: 'success' },
};

/**
 * A support request. Three states, and the middle one carries the point: an
 * admin has replied but nobody has agreed it is finished, which is different
 * from both "untouched" and "done".
 *
 * Labels are masculine to agree with *zahtjev*: the section is "Podrška" and an
 * item in it is a "zahtjev za podršku". Deliberately not "prijava", which in
 * Serbian also means *signing in* — the login page is titled exactly that.
 */
export const ISSUE_STATUS: Record<IssueStatus, StatusDisplay> = {
  open: { label: 'Otvoren', color: 'warning' },
  answered: { label: 'Odgovoren', color: 'info' },
  closed: { label: 'Zatvoren', color: 'default' },
};

export const USER_ROLE: Record<UserRole, StatusDisplay> = {
  admin: { label: 'Administrator', color: 'secondary' },
  teacher: { label: 'Predavač', color: 'primary' },
  student: { label: 'Student', color: 'default' },
};

/*
 * Booleans get helpers rather than lookup tables — there's no enum to key on.
 */

export const publishStatus = (published: boolean): StatusDisplay =>
  published ? { label: 'Objavljena', color: 'success' } : { label: 'Nacrt', color: 'default' };

/**
 * Whether an account can still sign in.
 *
 * Takes the timestamp rather than a boolean so call sites pass
 * `profile.deactivated_at` directly and can't disagree about what counts as
 * deactivated.
 */
export const accountStatus = (deactivatedAt: string | null): StatusDisplay =>
  deactivatedAt ? { label: 'Deaktiviran', color: 'error' } : { label: 'Aktivan', color: 'success' };

/**
 * Where a printed certificate has got to.
 *
 * Three states, not two, since migration 0024 added `delivered_at`: nobody
 * asked, somebody asked and it is waiting, and it has been posted. Before that
 * column existed this could only ever say whether a request had been *made*,
 * and the screens had to spell out that they knew nothing about fulfilment.
 *
 * Takes the timestamp rather than a boolean, so call sites pass
 * `certificate.delivered_at` straight in and cannot disagree about what counts
 * as sent — the same shape as `accountStatus`.
 *
 * Note "Poslano" wins over "Zatražena dostava": `requested_delivery` stays true
 * after fulfilment (it is the student's record of having asked), so checking it
 * first would leave every posted certificate reading as still pending.
 */
export const deliveryStatus = (requested: boolean, deliveredAt: string | null): StatusDisplay => {
  if (deliveredAt) return { label: 'Poslano', color: 'success' };
  return requested
    ? { label: 'Zatražena dostava', color: 'warning' }
    : { label: 'Bez zahtjeva', color: 'default' };
};
