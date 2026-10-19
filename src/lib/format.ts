/**
 * Display formatting. Every price/date rendered anywhere in the app goes
 * through here, so the locale and currency are decided in one place rather
 * than re-chosen (and quietly diverging) at each call site.
 *
 * ## Formatted by hand, not by `Intl`
 *
 * Prices and dates used to go through `Intl.NumberFormat` / `Intl.DateTimeFormat`
 * with a `bs-BA` locale. That is correct *when the runtime has Bosnian locale
 * data* — and silently wrong when it does not. A runtime missing `bs` falls back
 * to its default locale, and an English fallback puts the currency symbol in
 * front: `KM 123` instead of `123 KM`. Same class of bug for dates
 * (`8/6/2026`), and it appears on some machines and not others, which is the
 * worst way for a formatting bug to behave.
 *
 * So the two formats the product actually specifies are built from parts here:
 *
 *   - money  → `1.500 KM`   (dot thousands, comma decimals, symbol last)
 *   - date   → `06.08.2026.`
 *
 * No locale data involved, therefore identical on every machine. `Intl` is
 * still the right tool when a format is genuinely locale-dependent — it just
 * isn't, when the product has one fixed answer.
 */

const CURRENCY = 'KM';

/** Zero-pads to two digits: `6` → `06`. */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * `1500` → `1.500`, `1234.5` → `1.234,5`, `123` → `123`.
 *
 * Bosnian convention: `.` groups thousands, `,` separates decimals — the
 * opposite of English, which is exactly why a locale fallback is so visible.
 * Trailing zero decimals are dropped, since prices are nearly always whole
 * marks and `1.500,00 KM` is noise.
 */
function formatAmount(value: number): string {
  const [whole, fraction = ''] = Math.abs(value).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${value < 0 ? '-' : ''}${grouped}${trimmed ? `,${trimmed}` : ''}`;
}

/** `1500` → `1.500 KM`. Free courses read as "Besplatno" rather than "0 KM". */
export function formatPrice(price: number): string {
  if (price === 0) return 'Besplatno';
  return `${formatAmount(price)} ${CURRENCY}`;
}

/** ISO timestamp → `06.08.2026.` — rendered in the viewer's own timezone. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`;
}

/** ISO timestamp → `06.08.2026. 14:30` */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * ISO timestamp → `prije 5 minuta`, `jučer`, `prije 3 dana`.
 *
 * Notification lists are read by "how fresh is this", not "what date was it",
 * so an absolute timestamp makes the reader do arithmetic to answer the only
 * question they have. Falls back to the absolute date past a week, where
 * "prije 43 dana" stops being easier than reading the date.
 *
 * Built from `pluralBs` rather than `Intl.RelativeTimeFormat` for the same
 * reason as the two above: the relative formatter renders `sr` in **Cyrillic**
 * and an absent `bs` falls back to English, so the one string a user reads
 * dozens of times a day was the most locale-fragile thing in the app.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.round((Date.now() - then) / 1000);

  // A timestamp in the future is either clock skew or a scheduled item; either
  // way "prije -3 minute" is nonsense, so show the date instead.
  if (seconds < 0) return formatDate(iso);

  if (seconds < 60) return 'upravo sada';

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `prije ${minutes} ${pluralBs(minutes, 'minut', 'minute', 'minuta')}`;
  }

  if (seconds < 86_400) {
    const hours = Math.round(seconds / 3600);
    return `prije ${hours} ${pluralBs(hours, 'sat', 'sata', 'sati')}`;
  }

  if (seconds < 604_800) {
    const days = Math.round(seconds / 86_400);
    if (days === 1) return 'jučer';
    return `prije ${days} ${pluralBs(days, 'dan', 'dana', 'dana')}`;
  }

  return formatDate(iso);
}

/** Trims long text to a card-friendly length without cutting mid-word. */
export function truncate(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

/**
 * Bosnian plural form for a count.
 *
 * There are three, chosen by the *last digit* (with a carve-out for the teens):
 *
 *   1 zadatak  ·  21 zadatak  ·  101 zadatak       → `one`
 *   2 zadatka  ·  34 zadatka                       → `few`   (last digit 2–4)
 *   5 zadataka · 11 zadataka · 100 zadataka        → `many`  (everything else, incl. 11–14)
 *
 * The 11–14 exception is the part that's easy to miss: 11 ends in 1 but takes
 * `many`, so "11 zadatak" is wrong. Pass all three forms and let this pick.
 *
 *   `${n} ${pluralBs(n, 'zadatak', 'zadatka', 'zadataka')}`  →  "3 zadatka"
 */
export function pluralBs(count: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(count) % 100;
  const lastOne = lastTwo % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (lastOne === 1) return one;
  if (lastOne >= 2 && lastOne <= 4) return few;
  return many;
}

/** `3` → `3 obuke`. The count of courses in a category, phrased correctly. */
export function formatCourseCount(count: number): string {
  return `${count} ${pluralBs(count, 'obuka', 'obuke', 'obuka')}`;
}

/** First letters of a name, for avatar fallbacks. */
export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
