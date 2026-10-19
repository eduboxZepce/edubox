import { z } from '@/lib/openapi/zod';

/**
 * Per-user settings that are neither identity nor notification routing:
 * the colour scheme and the newsletter opt-in (migration 0029).
 *
 * The table is **sparse** — a row appears the first time someone changes
 * something — so the API always answers with a complete object filled in from
 * `DEFAULT_PREFERENCES`. Same contract as `/api/notification-preferences`:
 * a client never has to know that "no row" means anything.
 */
export const themePreferenceSchema = z.enum(['light', 'dark', 'system']).openapi('ThemePreference');

export const userPreferencesSchema = z
  .object({
    theme: themePreferenceSchema,
    newsletter_opt_in: z.boolean(),
  })
  .openapi('UserPreferences');

/**
 * Both fields optional — the settings screen sends only what changed, and the
 * route merges before upserting. An upsert writes whole rows, so sending just
 * `theme` without merging would reset `newsletter_opt_in` to its column
 * default; the same read-modify-write reasoning as `applyModuleProgress`.
 */
export const updateUserPreferencesSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    newsletter_opt_in: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nema izmjena za čuvanje.',
  })
  .openapi('UpdateUserPreferencesRequest');

/** Both endpoints answer with the complete merged object in an envelope. */
export const userPreferencesResponseSchema = z
  .object({ data: userPreferencesSchema })
  .openapi('UserPreferencesResponse');

/**
 * What a user gets before they have ever opened the settings screen.
 *
 * `system` because it is the honest default — the browser already reports an
 * OS-level preference, and overriding it with a guess is worse than following
 * it. `newsletter_opt_in: false` because an opt-in has to be opted into.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  newsletter_opt_in: false,
};

export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesSchema>;
