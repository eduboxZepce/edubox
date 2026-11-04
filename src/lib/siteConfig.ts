/**
 * Site-wide facts: the brand, how to reach us, who we legally are.
 *
 * **The values are not here.** They live in `brand/config.ts` at the repo
 * root, next to the logo, so that setting up a new client is one folder. This
 * module re-exports them under the name the app has always used (`SITE`) and
 * adds the few values derived from them, so no component needs to know where
 * the config file sits.
 *
 * See `brand/config.ts` for what belongs in the config and what does not, and
 * `docs/guides/new-client-setup.md` for the whole new-client checklist.
 */
import { BRAND } from '../../brand/config';

export type { LiveStatKey, SiteStat, BrandConfig } from '@/lib/brand/types';

export const SITE = BRAND;

/** `www.example.ba` — the host of the canonical URL, as printed in copy. */
export const SITE_HOST = new URL(SITE.url).host;

/** `example.ba` — the bare domain, without `www.`. */
export const SITE_DOMAIN = SITE_HOST.replace(/^www\./, '');
