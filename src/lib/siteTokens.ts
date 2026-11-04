import { SITE, SITE_DOMAIN, SITE_HOST } from '@/lib/siteConfig';

/**
 * `{{placeholders}}` that Markdown content may use for facts from
 * `brand/config.ts`.
 *
 * ## Why
 *
 * The terms and the privacy policy name the platform, its address, the company
 * behind it and the contact email over and over. Those texts live in the
 * database (an admin edits them), and the starting versions ship in migration
 * 0034 — so without placeholders every new client would start with another
 * client's name in their legal documents, and correcting the company address
 * would mean finding it in a dozen places.
 *
 * Written `{{company.legalName}}`, the fact is filled in at render time from
 * the config, so the same starting text is correct for every client. An admin
 * may keep the placeholders or overwrite them with plain text; both work.
 *
 * Applied by `<MarkdownContent>` (blog, legal pages, the editor preview) and by
 * `renderMarkdownEmail` (the newsletter), so a placeholder means the same thing
 * wherever Markdown is written.
 *
 * An unknown placeholder is left exactly as typed — a visible `{{typo}}` is a
 * mistake an admin can see and fix, whereas deleting it would hide it. Same rule
 * as the payment-purpose template.
 */
export const SITE_TOKENS = {
  'site.name': SITE.name,
  'site.shortName': SITE.shortName,
  'site.url': SITE.url,
  'site.host': SITE_HOST,
  'site.domain': SITE_DOMAIN,
  'contact.email': SITE.contact.email,
  'contact.phone': SITE.contact.phone.display,
  'company.legalName': SITE.company.legalName,
  'company.address': SITE.company.address,
  'company.idNumber': SITE.company.idNumber,
} as const satisfies Record<string, string>;

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function fillSiteTokens(text: string): string {
  return text.replace(TOKEN, (match, key: string) =>
    key in SITE_TOKENS ? SITE_TOKENS[key as keyof typeof SITE_TOKENS] : match,
  );
}
