/**
 * Feature flags, for showing the product in stages.
 *
 * The app is finished; these exist so it can be *presented* a segment at a
 * time — turn one on every few weeks, and with everything on it behaves exactly
 * as it does with no flags at all.
 *
 * ## Default on, not default off
 *
 * A flag that is absent means **enabled**. Only the literal string `"false"`
 * turns something off.
 *
 * The alternative — default off — would mean a fresh clone, a CI run or a
 * forgotten variable in a new environment silently ships a crippled app, and
 * every deploy target would have to list every flag to get the normal product.
 * Defaulting on means the flags are a deliberate subtraction from a working
 * whole, which is what they are. It also makes the promise easy to keep: delete
 * the variables and everything is back.
 *
 * ## They must be `NEXT_PUBLIC_`
 *
 * Next inlines these at build time, and only variables with that prefix reach
 * the browser. A flag read in a Client Component (most of this app) would be
 * `undefined` without it, so the feature would look enabled on the server and
 * disabled on the client — or the reverse. The whole file is therefore written
 * with **literal** `process.env.NEXT_PUBLIC_…` reads: Next substitutes them
 * textually, so `process.env[someVariable]` does not work and would silently
 * evaluate to undefined.
 *
 * ## What a flag does and does not do
 *
 * A flag hides a feature: its nav entries, its pages, and the UI that leads to
 * it. **It is not access control.** The API routes and RLS policies are
 * unchanged, so a flag being off does not make an endpoint unreachable to
 * someone who types the URL — it makes the product not offer it. That is the
 * right level for a staged demo, and the wrong level for security; nothing here
 * is protecting anything.
 */

/** Only an explicit "false" disables. Anything else — including unset — is on. */
function enabled(value: string | undefined): boolean {
  return value !== 'false';
}

export const FEATURES = {
  /**
   * The public catalogue: `/courses`, the featured-courses band on the landing
   * page, and every "browse courses" link. With this off a course page is
   * reachable only when signed in — it is also the enrolled student's way into
   * their modules, so it cannot simply disappear (see `isDisabledRoute`).
   */
  catalog: enabled(process.env.NEXT_PUBLIC_FEATURE_CATALOG),

  /**
   * Buying access: the request button, the admin purchase queue, the student's
   * purchases page, and the payment details shown alongside a reference.
   */
  purchases: enabled(process.env.NEXT_PUBLIC_FEATURE_PURCHASES),

  /**
   * Quizzes on a module — authoring them and taking them. Independent of
   * `tasks`: a course can be built with one, the other, or neither.
   *
   * A hidden quiz still counts towards finishing its module (the database
   * derives completion from what exists, not from what is shown), so a module
   * that has one cannot be completed while this is off. Demo with courses
   * built without quizzes, or the course stalls at that module.
   */
  quizzes: enabled(process.env.NEXT_PUBLIC_FEATURE_QUIZZES),

  /**
   * Tasks: authoring them, the student's task screen, the admin submission
   * queue, and the review thread on both sides. The same completion caveat as
   * `quizzes` applies.
   */
  tasks: enabled(process.env.NEXT_PUBLIC_FEATURE_TASKS),

  /**
   * Certificates: the certificate page, the PDF, the printed-copy request, and
   * every mention of one when a course is finished. Issuing still happens
   * silently in the database, so students who finish while this is off find
   * their certificate waiting once it is turned on.
   */
  certificates: enabled(process.env.NEXT_PUBLIC_FEATURE_CERTIFICATES),

  /**
   * In-app notifications: the bell, the list, and the per-event settings tab.
   * Email delivery rides on this too — a notification nobody can see or
   * configure should not arrive by mail either.
   */
  notifications: enabled(process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS),

  /** The support channel: `/issues` for users and the admin queue. */
  support: enabled(process.env.NEXT_PUBLIC_FEATURE_SUPPORT),

  /** The blog: its index, its posts, and the footer link to them. */
  blog: enabled(process.env.NEXT_PUBLIC_FEATURE_BLOG),

  /**
   * The newsletter: the opt-in in settings, and the admin composer and export.
   */
  newsletter: enabled(process.env.NEXT_PUBLIC_FEATURE_NEWSLETTER),

  /**
   * Teachers as scoped authors — the role in the admin user editor, and the
   * course-owner assignment. The database rules stay in force regardless; this
   * only stops the product offering the role.
   */
  teachers: enabled(process.env.NEXT_PUBLIC_FEATURE_TEACHERS),

  /**
   * The light/dark toggle and its settings tab. Off means light everywhere,
   * regardless of a stored preference or the OS setting.
   */
  themeSwitch: enabled(process.env.NEXT_PUBLIC_FEATURE_THEME_SWITCH),
} as const;

export type FeatureName = keyof typeof FEATURES;

/** Readable in a condition: `isEnabled('blog')`. */
export function isEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}

/**
 * The prefixes a disabled feature owns, for `proxy.ts`.
 *
 * Hiding a link is presentation; this is what makes the URL itself stop
 * resolving, so a bookmark or a typed address during a demo does not walk into
 * a section that is supposed to be weeks away.
 *
 * `catalog` is absent because it cannot be expressed as a prefix; see
 * `isDisabledRoute`.
 */
export const FEATURE_ROUTES: Partial<Record<FeatureName, readonly string[]>> = {
  purchases: ['/dashboard/purchases', '/admin/purchases', '/admin/settings/payment'],
  tasks: ['/admin/submissions'],
  certificates: [
    '/certificates',
    '/dashboard/certificates',
    '/admin/certificates',
    '/provjera-certifikata',
  ],
  notifications: ['/notifications', '/settings/notifications'],
  support: ['/issues', '/admin/issues'],
  blog: ['/blog'],
  newsletter: ['/settings/newsletter', '/admin/settings/newsletter'],
  themeSwitch: ['/settings/appearance'],
};

/**
 * Pages that sit *inside* a URL another feature owns, so no prefix can name
 * them: the quiz and task screens hang off a module, on both the student side
 * (`/courses/{slug}/modules/{id}/quiz`) and the authoring side
 * (`/admin/courses/{id}/modules/{id}/quiz`).
 */
export const FEATURE_ROUTE_PATTERNS: Partial<Record<FeatureName, readonly RegExp[]>> = {
  quizzes: [/^(?:\/admin)?\/courses\/[^/]+\/modules\/[^/]+\/quiz(?:\/|$)/],
  tasks: [/^(?:\/admin)?\/courses\/[^/]+\/modules\/[^/]+\/task(?:\/|$)/],
};

const underPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Whether `pathname` belongs to a feature that is switched off, for `proxy.ts`.
 *
 * ## The catalogue is the one rule that depends on who is asking
 *
 * `/courses/{slug}` is two pages at one address: the public sales page, and
 * the enrolled student's course page with its module list — the only way into
 * the module viewer. Turning the catalogue off must remove the first without
 * stranding the second, so the index 404s for everyone and a course page only
 * for a signed-out visitor. A signed-in user reaches a course from their own
 * dashboard, never by browsing.
 */
export function isDisabledRoute(pathname: string, { signedIn }: { signedIn: boolean }): boolean {
  if (!FEATURES.catalog) {
    if (pathname === '/courses') return true;
    if (!signedIn && pathname.startsWith('/courses/')) return true;
  }

  return (Object.keys(FEATURES) as FeatureName[]).some(
    (feature) =>
      !FEATURES[feature] &&
      ((FEATURE_ROUTES[feature] ?? []).some((prefix) => underPrefix(pathname, prefix)) ||
        (FEATURE_ROUTE_PATTERNS[feature] ?? []).some((pattern) => pattern.test(pathname))),
  );
}
