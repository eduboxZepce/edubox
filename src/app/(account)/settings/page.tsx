import { redirect } from 'next/navigation';
import { SETTINGS_SECTIONS } from '@/lib/settingsSections';

/**
 * `/settings` has no content of its own — it is the address the account menu
 * points at, and it lands on the first section.
 *
 * A redirect rather than duplicating the notifications screen here, so there is
 * exactly one page rendering that matrix and the tab highlighting has a real
 * URL to match against.
 */
export default function SettingsIndexPage() {
  redirect(SETTINGS_SECTIONS[0].href);
}
