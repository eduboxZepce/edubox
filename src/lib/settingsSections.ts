/**
 * The tabs under `/settings`, in order.
 *
 * Lives in `lib/` rather than in `<SettingsTabs>` because the index page — a
 * Server Component — needs the list too, and importing a plain value out of a
 * `'use client'` module hands a Server Component a client reference rather than
 * the array.
 */
export const SETTINGS_SECTIONS = [
  { href: '/settings/notifications', label: 'Obavještenja' },
  { href: '/settings/newsletter', label: 'Newsletter' },
  { href: '/settings/appearance', label: 'Izgled' },
] as const;
