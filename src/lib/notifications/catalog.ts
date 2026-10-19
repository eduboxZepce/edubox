import type { UserRole } from '@/lib/auth/routes';
import type { Database } from '@/types/database.types';
import { FEATURES, type FeatureName } from '@/lib/features';

export type NotificationType = Database['public']['Enums']['notification_type'];

/**
 * Every kind of notification the app can send, in one place.
 *
 * This file is the single source of truth for three separate things that must
 * never drift apart:
 *
 *   1. **the enum** — the keys here are exactly `notification_type` in the
 *      database (migration 0025). TypeScript enforces that: `NotificationType`
 *      is generated from the schema, so a missing or invented key fails to
 *      compile;
 *   2. **the settings screen** — its labels, its grouping, and which rows a
 *      given role is even shown;
 *   3. **who can receive what** — `audience` is a UI filter, not a guard. It
 *      keeps a student from being offered a switch for "somebody requested a
 *      course", which no student is ever sent. What actually decides the
 *      recipients is the call site, and the database is what enforces that a
 *      notification only ever reaches the row's own `user_id`.
 *
 * Adding a type means: a migration for the enum value (`ALTER TYPE … ADD VALUE`
 * must be alone in its file), an entry here, and a call to `notifyUsers`.
 */
export type NotificationGroup =
  'purchases' | 'submissions' | 'certificates' | 'account' | 'support';

export type NotificationDefinition = {
  /** Shown as the row label on the settings screen. */
  label: string;
  /** One line under it, saying when this actually fires. */
  description: string;
  /** Roles that can ever receive this. Filters the settings screen only. */
  audience: UserRole[];
  group: NotificationGroup;
};

export const NOTIFICATION_GROUPS: Record<
  NotificationGroup,
  {
    title: string;
    description: string;
    /**
     * The feature this group's events belong to. While it is switched off the
     * group is neither shown in settings nor sent — see
     * `isNotificationTypeEnabled`.
     */
    feature?: FeatureName;
  }
> = {
  purchases: {
    feature: 'purchases',
    title: 'Kupovine',
    description: 'Zahtjevi za pristup obukama i odluke o njima.',
  },
  submissions: {
    feature: 'tasks',
    title: 'Zadaci',
    description: 'Predaje zadataka, poruke u prepisci i odluke predavača.',
  },
  certificates: {
    feature: 'certificates',
    title: 'Certifikati',
    description: 'Izdavanje certifikata i slanje štampanih primjeraka.',
  },
  account: {
    title: 'Nalog i obuke',
    description: 'Promjene na vašem nalogu i na obukama koje vodite.',
  },
  support: {
    feature: 'support',
    title: 'Podrška',
    description: 'Pitanja i problemi upućeni administratorima.',
  },
};

export const NOTIFICATION_CATALOG: Record<NotificationType, NotificationDefinition> = {
  /* ---- purchases ---- */
  purchase_requested: {
    label: 'Novi zahtjev za kupovinu',
    description: 'Kada student zatraži pristup obuci i čeka odobrenje.',
    // Only admins decide on purchases, so only admins are told. A teacher may
    // read the requests on their own courses but cannot act on them, and a
    // notification you can do nothing about is noise.
    audience: ['admin'],
    group: 'purchases',
  },
  purchase_approved: {
    label: 'Pristup odobren',
    description: 'Kada vam administrator odobri pristup obuci.',
    audience: ['student'],
    group: 'purchases',
  },
  purchase_denied: {
    label: 'Zahtjev odbijen',
    description: 'Kada vam administrator odbije zahtjev za pristup obuci.',
    audience: ['student'],
    group: 'purchases',
  },

  /* ---- submissions ---- */
  submission_received: {
    label: 'Novo predano rješenje',
    description: 'Kada student preda rješenje zadatka na obuci koju pregledate.',
    audience: ['admin', 'teacher'],
    group: 'submissions',
  },
  submission_message: {
    label: 'Nova poruka u prepisci',
    description: 'Kada druga strana pošalje poruku u prepisci o zadatku.',
    audience: ['admin', 'teacher', 'student'],
    group: 'submissions',
  },
  submission_needs_revision: {
    label: 'Zatražena izmjena rješenja',
    description: 'Kada predavač traži da ispravite predano rješenje.',
    audience: ['student'],
    group: 'submissions',
  },
  submission_approved: {
    label: 'Rješenje prihvaćeno',
    description: 'Kada predavač prihvati vaše rješenje i zadatak bude završen.',
    audience: ['student'],
    group: 'submissions',
  },

  /* ---- certificates ---- */
  certificate_issued: {
    label: 'Certifikat izdan',
    description: 'Kada završite sve module obuke i dobijete certifikat.',
    audience: ['student'],
    group: 'certificates',
  },
  certificate_delivery_requested: {
    label: 'Zahtjev za slanje certifikata',
    description: 'Kada student zatraži da mu se štampani certifikat pošalje poštom.',
    audience: ['admin'],
    group: 'certificates',
  },
  certificate_delivered: {
    label: 'Certifikat poslan poštom',
    description: 'Kada administrator označi da je vaš štampani certifikat poslan.',
    audience: ['student'],
    group: 'certificates',
  },

  /* ---- account ---- */
  course_published: {
    label: 'Obuka objavljena',
    description: 'Kada administrator objavi obuku čiji ste autor.',
    // A teacher cannot publish their own course, so this is the only way they
    // learn it went live.
    audience: ['teacher'],
    group: 'account',
  },
  account_role_changed: {
    label: 'Promjena uloge naloga',
    description: 'Kada vam administrator promijeni ulogu na nalogu.',
    audience: ['admin', 'teacher', 'student'],
    group: 'account',
  },

  /* ---- support ---- */
  issue_opened: {
    label: 'Novi zahtjev za podršku',
    description: 'Kada korisnik pošalje novo pitanje ili prijavi problem.',
    // Only admins handle these — deliberately not teachers, since a request
    // may well be about one.
    audience: ['admin'],
    group: 'support',
  },
  issue_reply: {
    label: 'Odgovor podrške',
    description: 'Kada druga strana odgovori u prepisci o zahtjevu.',
    audience: ['admin', 'teacher', 'student'],
    group: 'support',
  },
  issue_closed: {
    label: 'Zahtjev zatvoren',
    description: 'Kada administrator zatvori vaš zahtjev.',
    audience: ['admin', 'teacher', 'student'],
    group: 'support',
  },
};

/** Every type, in the order the settings screen should show them. */
export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_CATALOG) as NotificationType[];

/**
 * The types worth offering to one role.
 *
 * Note this is generous by design: a student who is later promoted to teacher
 * keeps whatever they had set, and the extra rows simply appear. Nothing is
 * deleted when a role changes, because a demotion is often temporary and
 * silently discarding someone's preferences is worse than showing them fewer
 * switches for a while.
 */
export function notificationTypesForRole(role: UserRole): NotificationType[] {
  return NOTIFICATION_TYPES.filter((type) => NOTIFICATION_CATALOG[type].audience.includes(role));
}

/**
 * Whether this type may be shown or sent under the current feature flags.
 *
 * Notifications as a whole switch off with `notifications`; each group also
 * goes quiet with its own feature. The second half matters even when nothing in
 * the UI can trigger the event: issuing a certificate happens on its own when a
 * course is finished, and a "your certificate is ready" message would announce
 * a feature that is meant to look unbuilt.
 */
export function isNotificationTypeEnabled(type: NotificationType): boolean {
  const feature = NOTIFICATION_GROUPS[NOTIFICATION_CATALOG[type].group].feature;
  return FEATURES.notifications && (!feature || FEATURES[feature]);
}
