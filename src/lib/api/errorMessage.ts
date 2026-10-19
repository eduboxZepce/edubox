import { isApiRequestError } from './client';

/**
 * Turns any thrown value into a sentence we're willing to show a user.
 *
 * Every error surface in the app (toasts, `<ErrorState>`, form-level alerts)
 * funnels through this, so a 403 reads the same wherever it happens and no raw
 * exception text ever reaches the screen.
 */

/**
 * Status-keyed fallbacks. The server's own `error` string wins when it's
 * present and meaningful — these cover the cases where it isn't, or where it's
 * an internal message not meant for a user.
 */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Podaci koje ste poslali nisu ispravni.',
  401: 'Niste prijavljeni. Prijavite se ponovo.',
  403: 'Nemate dozvolu za ovu akciju.',
  404: 'Traženi sadržaj ne postoji.',
  409: 'Ovaj zapis već postoji.',
  413: 'Datoteka je prevelika.',
  500: 'Došlo je do greške na serveru. Pokušajte ponovo.',
};

export function errorMessage(error: unknown, fallback = 'Došlo je do neočekivane greške.'): string {
  if (isApiRequestError(error)) {
    // 500s can carry internal detail (a Postgres message, a stack hint) that is
    // noise at best and a leak at worst — always use our own wording there.
    if (error.status >= 500) return STATUS_MESSAGES[500];
    return error.message || STATUS_MESSAGES[error.status] || fallback;
  }

  // A failed fetch (offline, DNS, connection reset) never reaches ApiRequestError.
  if (error instanceof TypeError) {
    return 'Neuspješno povezivanje sa serverom. Provjerite internetsku vezu.';
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

/** True when the error is a specific HTTP status — for branching on 403 vs 404. */
export function isStatus(error: unknown, status: number): boolean {
  return isApiRequestError(error) && error.status === status;
}
