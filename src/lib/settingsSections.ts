import { FEATURES } from '@/lib/features';

/**
 * The tabs under `/settings`, minus any whose feature is switched off.
 *
 * Lives in `lib/` rather than in `<SettingsTabs>` because the index page — a
 * Server Component — needs the list too, and importing a plain value out of a
 * `'use client'` module hands a Server Component a client reference rather than
 * the array.
 *
 * Every section belongs to a flag, so this can be empty. When it is, the
 * account menu drops "Postavke" and `/settings` 404s, rather than opening a
 * screen with no tabs on it.
 */
export const SETTINGS_SECTIONS = [
  { href: '/settings/notifications', label: 'Obavještenja', enabled: FEATURES.notifications },
  { href: '/settings/newsletter', label: 'Newsletter', enabled: FEATURES.newsletter },
  { href: '/settings/appearance', label: 'Izgled', enabled: FEATURES.themeSwitch },
]
  .filter((section) => section.enabled)
  .map(({ href, label }) => ({ href, label }));
