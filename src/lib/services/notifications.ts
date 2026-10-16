import 'server-only';

import { after } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/client';
import { publicEnv } from '@/lib/env';
import { renderEmail } from '@/lib/email/template';
import { isNotificationTypeEnabled, type NotificationType } from '@/lib/notifications/catalog';

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Telling people that something happened.
 *
 * ## Two channels, one decision point
 *
 * A notification is a row in `notifications` (the in-app bell) and, separately,
 * an email. `notification_preferences` decides each independently, per user per
 * type, and **a missing preference row means both are on** — see migration
 * 0025 for why the table is sparse.
 *
 * ## It runs after the response, and it cannot fail the request
 *
 * `notifyUsers` is scheduled with `after()` from `next/server`, so it happens
 * once the response has already gone to the client. Two reasons, and both are
 * load-bearing:
 *
 *   - **latency.** Approving a purchase should not wait on an SMTP round trip.
 *   - **blast radius.** A notification is a side effect of an action that has
 *     already succeeded. If Resend is down, the purchase is still approved; a
 *     throw here must never turn that into a 500 and invite the admin to press
 *     the button again.
 *
 * Everything inside is therefore wrapped and logged rather than thrown. The
 * failure mode is a missing notification, which is recoverable, instead of a
 * failed mutation, which may not be.
 */
export type NotificationEmail = {
  subject: string;
  heading: string;
  lines: string[];
  action?: { label: string; href: string };
};

export type NotifyInput = {
  /** Who to tell. Empty is fine and does nothing — call sites often filter. */
  userIds: string[];
  type: NotificationType;
  /** In-app title. Short; it is a list row. */
  title: string;
  /** In-app body. One or two sentences. */
  body: string;
  /** Where the bell should take them. Relative path, e.g. `/admin/purchases/…`. */
  link?: string | null;
  /**
   * The email version. Omit and this notification is in-app only.
   *
   * Written separately from `title`/`body` on purpose: an email arrives with no
   * surrounding context and has to re-state things the in-app list gets from
   * the screen around it.
   */
  email?: NotificationEmail;
};

/** Absolute URL for an email button. Relative links are meaningless in mail. */
function absoluteUrl(path: string): string {
  const base = publicEnv.siteUrl;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Delivers to everyone in `input.userIds`, honouring each one's preferences.
 *
 * Exported for the one case that needs to await it — a script or a test. Route
 * handlers should call `notifyAfterResponse` instead.
 */
export async function notifyUsers(svc: ServiceClient, input: NotifyInput): Promise<void> {
  // A switched-off feature sends nothing, by either channel. See
  // `isNotificationTypeEnabled` for why this is checked here and not only in
  // the UI.
  if (!isNotificationTypeEnabled(input.type)) return;

  const userIds = [...new Set(input.userIds)].filter(Boolean);
  if (userIds.length === 0) return;

  // One query for the recipients, one for their preferences — not one pair per
  // person. A course with several admins would otherwise fan out badly.
  const { data: profiles, error: profilesError } = await svc
    .from('profiles')
    .select('id, full_name, email, deactivated_at')
    .in('id', userIds);

  if (profilesError) {
    console.error(`[notify] could not load recipients: ${profilesError.message}`);
    return;
  }

  const { data: prefs, error: prefsError } = await svc
    .from('notification_preferences')
    .select('user_id, email_enabled, in_app_enabled')
    .eq('type', input.type)
    .in('user_id', userIds);

  if (prefsError) {
    console.error(`[notify] could not load preferences: ${prefsError.message}`);
    return;
  }

  const prefFor = new Map(prefs?.map((p) => [p.user_id, p]) ?? []);

  // A deactivated account cannot sign in, so an in-app notification is unread
  // forever and an email invites someone to a door that is locked.
  const recipients = (profiles ?? []).filter((p) => !p.deactivated_at);

  const inAppRows = recipients
    .filter((p) => prefFor.get(p.id)?.in_app_enabled ?? true)
    .map((p) => ({
      user_id: p.id,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    }));

  if (inAppRows.length > 0) {
    const { error } = await svc.from('notifications').insert(inAppRows);
    if (error) console.error(`[notify] in-app insert failed: ${error.message}`);
  }

  if (!input.email) return;

  const emailRecipients = recipients.filter(
    (p) => p.email && (prefFor.get(p.id)?.email_enabled ?? true),
  );
  if (emailRecipients.length === 0) return;

  const action = input.email.action
    ? { label: input.email.action.label, href: absoluteUrl(input.email.action.href) }
    : undefined;

  // Sequential rather than `Promise.all`: these are a handful of addresses, and
  // a provider rate limit is far more annoying to debug than a few extra
  // milliseconds spent after the response has already been sent.
  for (const recipient of emailRecipients) {
    // Rendered per recipient, because the greeting carries their name.
    const { html, text } = renderEmail({
      heading: input.email.heading,
      recipientName: recipient.full_name ?? '',
      lines: input.email.lines,
      preheader: input.body,
      action,
    });
    await sendEmail({ to: recipient.email, subject: input.email.subject, html, text });
  }
}

/**
 * Schedule a notification to go out once the current response has been sent.
 *
 * This is what route handlers call. It builds its own service-role client
 * inside the callback rather than borrowing the caller's, because by the time
 * it runs the request is over and the caller's client may have been torn down.
 */
export function notifyAfterResponse(input: NotifyInput): void {
  if (input.userIds.length === 0) return;

  after(async () => {
    try {
      await notifyUsers(createServiceRoleClient(), input);
    } catch (error) {
      // The last line of defence. Everything above already handles its own
      // errors; this catches the ones nobody predicted, because an unhandled
      // rejection in `after()` is a crashed worker, not a logged warning.
      console.error('[notify] delivery threw', error);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Working out who to tell                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every active admin.
 *
 * Deliberately not "all staff": the admin-directed notifications are about
 * decisions only an admin can make (approving a purchase, posting a
 * certificate). Teachers are told about their own courses, through
 * `courseReviewerIds`.
 */
export async function adminIds(svc: ServiceClient): Promise<string[]> {
  const { data, error } = await svc
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .is('deactivated_at', null);

  if (error) {
    console.error(`[notify] could not resolve admins: ${error.message}`);
    return [];
  }
  return data.map((p) => p.id);
}

/**
 * Whoever may review work on a course: every admin, plus the teacher who owns
 * it. The application-side mirror of `can_review_submission()`.
 *
 * The owner is included only while they are still staff — `owns_course()` has
 * required `is_staff()` since migration 0019, so a demoted ex-owner can no
 * longer review and should not be told there is something to review.
 */
export async function courseReviewerIds(svc: ServiceClient, courseId: string): Promise<string[]> {
  const ids = await adminIds(svc);

  const { data: course } = await svc
    .from('courses')
    .select('owner_id, profiles!courses_owner_id_fkey(id, role, deactivated_at)')
    .eq('id', courseId)
    .maybeSingle();

  const owner = course?.profiles;
  if (owner && owner.role === 'teacher' && !owner.deactivated_at) ids.push(owner.id);

  return [...new Set(ids)];
}
