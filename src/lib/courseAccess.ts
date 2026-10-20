import type { Purchase, PurchaseStatus } from '@/lib/schemas/purchases.schema';

/**
 * Who may see and open what on a course page.
 *
 * Pure functions, deliberately: these rules decide what a paying student gets
 * and are the kind of thing that quietly rots when it lives inline in JSX.
 * Keeping them here means the page just renders the answer.
 *
 * None of this is a security boundary — the backend enforces the same rules
 * independently (RLS on `modules`, the purchase check in
 * `/api/courses/:id/modules`). This decides what the UI *offers*, so a student
 * is never invited to click something that will then 403.
 */

/** Where a viewer stands with respect to one course. */
export type PurchaseState = PurchaseStatus | 'none';

/**
 * Reduces a student's purchase rows for a course to a single state.
 *
 * A course can legitimately have more than one row: the unique index in
 * migration 0009 excludes `denied`, so a student who was rejected and
 * re-requested has both a denied row and a new one. Approved beats requested
 * beats revoked beats denied, which is why this can't just read the first row.
 */
export function purchaseStateFrom(purchases: Purchase[] | undefined): PurchaseState {
  if (!purchases?.length) return 'none';
  if (purchases.some((p) => p.status === 'approved')) return 'approved';
  if (purchases.some((p) => p.status === 'requested')) return 'requested';
  if (purchases.some((p) => p.status === 'revoked')) return 'revoked';
  if (purchases.some((p) => p.status === 'denied')) return 'denied';
  return 'none';
}

/** Whether the "request access" button should do anything. */
export function canRequestPurchase(state: PurchaseState): boolean {
  // Denied and revoked are deliberately re-requestable — the DB's unique index
  // covers only requested/approved, and a new request still needs an admin.
  return state === 'none' || state === 'denied' || state === 'revoked';
}

/**
 * A module as far as unlocking is concerned. Matches the shape returned by
 * `/api/courses/:id/progress`, so progress data can be passed straight in.
 */
export type UnlockableModule = {
  module_id: string;
  order: number;
  completed: boolean;
};

/**
 * The ids of the modules a viewer may open.
 *
 * The rule is sequential: every completed module, plus the first one that isn't
 * completed. That's what stops a student skipping ahead, and it matches the
 * backend's own gating rather than guessing at it.
 *
 * Note it's "completed ∪ first incomplete", not "everything up to the first
 * incomplete". Those differ if the data is ever out of order — a module
 * completed out of sequence stays open rather than being locked behind an
 * earlier gap, which is the forgiving direction to fail in.
 *
 * `bypassSequence` unlocks everything; admins get it so they can preview any
 * module without completing the course.
 */
export function unlockedModuleIds(
  modules: UnlockableModule[],
  { bypassSequence = false }: { bypassSequence?: boolean } = {},
): Set<string> {
  if (bypassSequence) return new Set(modules.map((m) => m.module_id));

  const ordered = [...modules].sort((a, b) => a.order - b.order);
  const unlocked = new Set(ordered.filter((m) => m.completed).map((m) => m.module_id));

  const firstIncomplete = ordered.find((m) => !m.completed);
  if (firstIncomplete) unlocked.add(firstIncomplete.module_id);

  return unlocked;
}

/** 0–100, for the progress bar. Guards the empty-course divide-by-zero. */
export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
