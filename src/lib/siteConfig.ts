/**
 * Site-wide facts: the brand, how to reach us, who we legally are.
 *
 * ## Why this is a file and not environment variables
 *
 * Everything here is the same in every environment — local, Vercel preview and
 * production all show the same phone number — and all of it is public. Env vars
 * earn their place when a value is secret or differs per deployment; neither is
 * true here. As env vars these would be untyped strings, copied by hand into
 * three Vercel environments, edited in a dashboard with no review, and still
 * needing a redeploy to change (`NEXT_PUBLIC_*` is inlined at build time). As a
 * file they are typed, reviewed like any other copy, and changed in one place.
 *
 * The test for adding something: **would it ever differ between preview and
 * production, or must it stay secret?** If yes, it belongs in `.env.example`.
 * If no, it belongs here.
 *
 * ## What is deliberately not here
 *
 * - **Payment details** (recipient, bank, account number) live in the database
 *   (`payment_settings`, edited at `/admin/settings/payment`). An admin must be
 *   able to correct an account number without a deploy.
 * - **Terms and privacy policy** — also the database (`/admin/settings/legal`),
 *   for the same reason.
 * - **Course categories in the footer** come from the `categories` table, so
 *   adding a category in `/admin/categories` is all it takes.
 * - **Section copy** (hero, how it works, FAQ answers…) stays in its
 *   component under `src/components/landing/`. This file holds the *facts* that
 *   copy quotes, so a fact quoted in several places changes once.
 *
 * Values marked `PLACEHOLDER` must be replaced before launch.
 */
type SiteConfig = {
  url: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  contact: {
    email: string;
    supportEmail: string;
    phone: { display: string; tel: string };
    hours: string;
  };
  service: {
    replyTime: string;
    reviewHours: number;
  };
  stats: { value: number; suffix?: string; label: string }[];
  social: { label: string; href: string }[];
  company: { legalName: string; address: string; idNumber: string };
};

/**
 * Hours within which a submitted task gets feedback. A constant of its own
 * because two entries below quote it: the service promise and a stat.
 */
const REVIEW_HOURS = 48;

export const SITE: SiteConfig = {
  /**
   * The canonical production origin — `www`, `https`, no trailing slash. The
   * apex domain redirects here (`next.config.ts`). Used when a production build
   * has no `NEXT_PUBLIC_SITE_URL`, so canonical URLs, the sitemap and share
   * images can never point at a `*.vercel.app` alias. See `publicEnv.siteUrl`.
   */
  url: 'https://www.edubox-zepce.ba',

  /**
   * The brand in full. Wherever the platform introduces itself: the home page
   * title, meta descriptions, the footer copyright, emails and the certificate.
   */
  name: 'Edubox Žepče',

  /**
   * The brand where space is tight or the full name has already been said: the
   * logo, the admin sidebar, the "— Edubox" suffix on every page title.
   */
  shortName: 'Edubox',

  /** Second half of the home page title: "Edubox Žepče — {tagline}". */
  tagline: 'online kursevi sa certifikatom',

  /** One sentence: the footer blurb and the default meta description. */
  description: 'Platforma za online kurseve s pregledom zadataka i certifikatom po završetku.',

  contact: {
    /** General enquiries. Also the fallback recipient of the contact form. PLACEHOLDER */
    email: 'info@edubox.ba',
    /** Shown on /kontakt for students already enrolled. PLACEHOLDER */
    supportEmail: 'podrska@edubox.ba',
    /**
     * `display` is what people read, `tel` is what a phone dials — written
     * separately because spacing that helps reading breaks a `tel:` link.
     * PLACEHOLDER
     */
    phone: { display: '+387 33 000 000', tel: '+38733000000' },
    /** When the phone is answered. */
    hours: 'Ponedjeljak – petak, 09:00 – 17:00',
  },

  /**
   * What the site promises about response times. Each is quoted in more than
   * one sentence, so a promise the team cannot keep is corrected here once.
   */
  service: {
    /**
     * How fast a message gets an answer. Read as the end of a sentence —
     * "Odgovaramo radnim danima, u pravilu {replyTime}." — on /kontakt, in its
     * search snippet, and under the FAQ.
     */
    replyTime: 'u toku istog dana',
    /** Task feedback, in hours. The FAQ answer and the stats band. */
    reviewHours: REVIEW_HOURS,
  },

  /**
   * The figures under the hero, in order. An empty list hides the band, which
   * is the right state until real numbers exist: invented ones are worse than
   * none. `suffix` follows the number ("h", "%"); thousands are grouped
   * automatically.
   * PLACEHOLDER — all four figures are invented.
   */
  stats: [
    { value: 42, label: 'OBJAVLJENA KURSA U PET OBLASTI' },
    { value: 6800, label: 'REGISTROVANIH STUDENATA' },
    { value: REVIEW_HOURS, suffix: 'h', label: 'ROK ZA PREGLED PREDANOG ZADATKA' },
    { value: 91, suffix: '%', label: 'STUDENATA ZAVRŠI UPISANI KURS' },
  ],

  /**
   * Profiles linked from the footer. An entry with an empty `href` is not
   * rendered, so a network the business is not on is simply left blank.
   * PLACEHOLDER — these point at the networks' home pages.
   */
  social: [
    { label: 'Instagram', href: 'https://instagram.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Facebook', href: 'https://facebook.com' },
  ],

  /**
   * The legal entity behind the site, printed under the footer's copyright.
   * Empty fields are skipped, so the line grows as the details are confirmed.
   * PLACEHOLDER — all empty until the client provides them.
   */
  company: {
    /** Registered name, e.g. "Edubox d.o.o." */
    legalName: '',
    /** Address of the registered seat. */
    address: '',
    /** Identification number (JIB / ID broj). */
    idNumber: '',
  },
};
