/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE CLIENT CONFIG — everything that makes this site one client's site.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Setting the platform up for a new client means editing this file, replacing
 * the two images beside it, running `npm run brand`, and filling in the
 * environment variables. The full checklist (accounts, keys, DNS) is
 * `docs/guides/new-client-setup.md`.
 *
 *   brand/config.ts   ← this file: name, domain, colours, contact, company
 *   brand/logo.svg    ← the logo mark (no text), any aspect ratio
 *   brand/hero.jpg    ← the landing page photo, landscape, ≥ 1600 px wide
 *   brand/og-image.jpg  (optional) a designed 1200×630 share image; without it
 *                       one is generated from the logo, name and colours
 *
 * After changing the logo, the photo, the name, the tagline or the colours, run
 *
 *   npm run brand
 *
 * and commit what it writes. It derives the favicon, app icons, email logo,
 * share image, certificate mark and the Supabase email template from this
 * folder, so none of those is ever edited by hand.
 *
 * ## What belongs here, and what does not
 *
 * The test: **is it public and the same in every environment?** Then it is
 * here. If it is secret, or differs between local / preview / production, it
 * is an environment variable (`.env.example`).
 *
 * Also not here, because an admin must be able to change them without a
 * deploy — they live in the database and are edited in the admin panel:
 * - payment details (`/admin/settings/payment`);
 * - terms and privacy policy (`/admin/settings/legal`) — these quote the
 *   values below through `{{…}}` placeholders, so they follow this file;
 * - course categories, courses, blog posts.
 *
 * Section copy (hero, FAQ answers…) stays in `src/components/landing/`; this
 * file holds the *facts* that copy quotes.
 */
import type { BrandConfig } from '../src/lib/brand/types';

/**
 * Hours within which a submitted task gets feedback. A constant because two
 * entries below quote it: the service promise and a stat.
 */
const REVIEW_HOURS = 48;

export const BRAND: BrandConfig = {
  url: 'https://www.edubox-zepce.ba',
  name: 'Edubox Žepče',
  shortName: 'Edubox',
  tagline: 'online obuke sa certifikatom',
  description: 'Platforma za online obuke s pregledom zadataka i certifikatom po završetku.',

  colors: {
    primary: { light: '#2f5bea', dark: '#6d8dff' },
    secondary: { light: '#7b3fe4', dark: '#a479ff' },
  },

  hero: {
    alt: 'Školska klupa s ruksakom, učenici razgovaraju u pozadini',
  },

  contact: {
    email: 'info@edubox-zepce.ba',
    phone: { display: '+387 32 880 273', tel: '+38732880273' },
    hours: 'Ponedjeljak – petak, 09:00 – 17:00',
  },

  service: {
    replyTime: 'u toku istog dana',
    reviewHours: REVIEW_HOURS,
  },

  /*
   * Entries with `live` are floors: the real count from the database replaces
   * them once it is higher. Invented figures are worse than none — use `[]`
   * until the client has real ones.
   */
  stats: [
    { value: 12, label: 'OBJAVLJENIH OBUKA', live: 'publishedCourses' },
    { value: 350, label: 'REGISTRIRANIH STUDENATA', live: 'students' },
    { value: REVIEW_HOURS, suffix: 'h', label: 'ROK ZA PREGLED PREDANOG ZADATKA' },
    { value: 78, suffix: '%', label: 'STUDENATA ZAVRŠI UPISANU OBUKU', live: 'completionRate' },
  ],

  /* Fill in the profile URLs once they exist; empty ones are hidden. */
  social: [
    { label: 'Instagram', href: '' },
    { label: 'LinkedIn', href: '' },
    { label: 'Facebook', href: '' },
  ],

  /* Must match the controller named in the privacy policy and the terms. */
  company: {
    legalName: 'Razvojna agencija Žepče',
    address: 'Ulica Prva bb, 72230 Žepče',
    idNumber: '4218693330009',
  },
};
