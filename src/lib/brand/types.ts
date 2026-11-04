/**
 * The shape of `brand/config.ts` — everything that makes this deployment one
 * particular client's site rather than another's.
 *
 * Types only, on purpose: `brand/config.ts` is also imported by
 * `scripts/generate-brand-assets.mjs` under plain Node, which strips type
 * imports but cannot resolve the `@/` alias or extensionless runtime imports.
 * Keep this file free of runtime code so that stays true.
 */

/** Figures `getLiveStats()` (`src/lib/server/landingStats.ts`) can read from the database. */
export type LiveStatKey = 'publishedCourses' | 'students' | 'completionRate';

export type SiteStat = {
  /** Shown as is, or as the floor when `live` is set. */
  value: number;
  suffix?: string;
  label: string;
  /**
   * Read the real figure from the database and show it instead of `value`
   * once it is higher. `value` stays the floor, so a new platform does not
   * open with "0 students".
   */
  live?: LiveStatKey;
};

/** A colour for each scheme. Hex (`#rrggbb`), because email and the PDF need real values. */
export type SchemeColor = {
  /** On the light scheme — dark enough to carry white text. */
  light: string;
  /** On the dark scheme — a lighter tint of the same hue, so it reads on near-black. */
  dark: string;
};

export type BrandConfig = {
  /**
   * The canonical production origin: `https://`, usually `www.`, no trailing
   * slash. If it starts with `www.`, the bare domain is redirected to it
   * (`next.config.ts`).
   */
  url: string;
  /** The brand in full: home page title, meta descriptions, emails, the certificate. */
  name: string;
  /** Where space is tight: the logo, the sidebar, the " — {shortName}" title suffix. */
  shortName: string;
  /** Second half of the home page title: "{name} — {tagline}". Lower-case start. */
  tagline: string;
  /** One sentence: the footer blurb and the default meta description. */
  description: string;

  colors: {
    /** Buttons, links, the active nav item, the email button, the browser bar. */
    primary: SchemeColor;
    /** Accents and the far end of the brand gradients. */
    secondary: SchemeColor;
  };

  /** The landing page photo. The file is `brand/hero.jpg`. */
  hero: {
    /** Describes the photo for screen readers. Not a caption. */
    alt: string;
  };

  contact: {
    /** The one public address: /kontakt, the footer, the legal texts, email footers. */
    email: string;
    /**
     * `display` is what people read, `tel` is what a phone dials — separate
     * because spacing that helps reading breaks a `tel:` link.
     */
    phone: { display: string; tel: string };
    /** When the phone is answered. */
    hours: string;
  };

  /** Promises quoted in several sentences, so each is corrected in one place. */
  service: {
    /** Reads as the end of "Odgovaramo radnim danima, u pravilu {replyTime}." */
    replyTime: string;
    /** Task feedback deadline in hours: the FAQ and the stats band. */
    reviewHours: number;
  };

  /** The figures under the hero. An empty list hides the band. */
  stats: SiteStat[];

  /** Footer profile links. An entry with an empty `href` is not rendered. */
  social: { label: string; href: string }[];

  /**
   * The legal entity behind the site: the footer, emails, structured data, and
   * the `{{company.*}}` placeholders in the legal texts. Empty fields are skipped.
   */
  company: { legalName: string; address: string; idNumber: string };
};
