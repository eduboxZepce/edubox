/**
 * The rules of the public certificate check (`/provjera-certifikata`).
 *
 * A visitor types a certificate number **and the holder's surname**, and only
 * a pair that matches is confirmed. The number alone is not enough because
 * numbers are sequential (CERT-2026-0001, 0002, …): a number-only lookup would
 * let anyone walk the range and harvest every graduate's name and course. The
 * people this page is for — an employer reading a CV — already have both.
 *
 * Plain functions, no dependencies: shared by the route (the real check), the
 * form (input format) and the certificate page (building the shareable link),
 * so the three cannot disagree about what matches.
 */

export const CERTIFICATE_NUMBER_PATTERN = /^CERT-\d{4}-\d{4,}$/;

export const VERIFICATION_PATH = '/provjera-certifikata';

/** " cert-2026-0042 " → "CERT-2026-0042". Forgiving about case and spacing only. */
export function normalizeCertificateNumber(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Lower-case, diacritics folded, punctuation and hyphens turned into spaces.
 *
 * Folding matters: a verifier on an English keyboard types "Begovic" for
 * "Begović". `đ` does not decompose under NFD, so it is spelled out first —
 * as `dj`, the usual way it is typed without the letter (and `dj` typed by the
 * visitor folds to the same thing).
 */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Whether `surname` names the holder of `fullName`.
 *
 * Accepted: the whole name, or any run of words after the first one — so
 * "Begović", "Hadžić" and "Begović Hadžić" all match "Lejla
 * Begović-Hadžić". The first word alone (a given name) never does: it is
 * far easier to guess, and nobody verifying a CV would type only that.
 */
export function surnameMatches(fullName: string, surname: string): boolean {
  const name = normalizeName(fullName).split(' ').filter(Boolean);
  const typed = normalizeName(surname).split(' ').filter(Boolean);
  if (typed.length === 0 || name.length === 0) return false;
  if (typed.join(' ') === name.join(' ')) return true;

  for (let start = 1; start + typed.length <= name.length; start++) {
    if (typed.every((word, i) => name[start + i] === word)) return true;
  }
  return false;
}

/** The last word of a full name, as written — what the share link fills in. */
export function surnameOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] ?? '';
}

/** A link that opens the check with both fields filled in and runs it. */
export function verificationHref(number: string, surname: string): string {
  const params = new URLSearchParams({ broj: number, prezime: surname });
  return `${VERIFICATION_PATH}?${params.toString()}`;
}
