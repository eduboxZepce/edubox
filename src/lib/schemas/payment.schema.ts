import { z } from '@/lib/openapi/zod';

/**
 * The seller's payment details (migration 0030) — who a student is transferring
 * money to, shown beside the purchase reference from 0028.
 *
 * Every field is nullable. An admin fills this in gradually, and a partly
 * filled record is still worth showing: a name and an account number are enough
 * to make a transfer, and withholding those until a SWIFT code exists would
 * help nobody.
 */
const optionalText = z.string().trim().max(200).nullable();

export const paymentSettingsSchema = z
  .object({
    seller_name: optionalText,
    address: optionalText,
    postal_code: optionalText,
    city: optionalText,
    country: optionalText,
    bank_name: optionalText,
    account_number: optionalText,
    swift: optionalText,
    tax_id: optionalText,
    payment_purpose_template: optionalText,
    note: z.string().trim().max(2000).nullable(),
    updated_at: z.string(),
  })
  .openapi('PaymentSettings');

/**
 * Every field optional — the admin form sends the whole record, but a partial
 * PATCH is legitimate and the route merges. `updated_at` is server-owned and
 * therefore absent here.
 */
export const updatePaymentSettingsSchema = paymentSettingsSchema
  .omit({ updated_at: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nema izmjena za čuvanje.',
  })
  .openapi('UpdatePaymentSettingsRequest');

export const paymentSettingsResponseSchema = z
  .object({ data: paymentSettingsSchema })
  .openapi('PaymentSettingsResponse');

export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export type UpdatePaymentSettingsRequest = z.infer<typeof updatePaymentSettingsSchema>;

/**
 * Is there enough here to actually pay?
 *
 * A name and an account number are the minimum a bank form needs. Below that
 * the student panel says "payment details are not set up yet" rather than
 * rendering a half-empty table that looks broken — and, more importantly, one
 * they might try to transfer money against.
 */
export function isPayable(settings: PaymentSettings | undefined | null): boolean {
  return Boolean(settings?.seller_name?.trim() && settings?.account_number?.trim());
}

/**
 * Fills `{reference}` and `{course}` in the purpose template.
 *
 * A template rather than a fixed string because what a bank wants in the
 * "svrha uplate" field varies, and the payment reference has to be able to sit
 * *inside* the sentence rather than only after it. Unknown placeholders are
 * left as they are — a visible `{foo}` is a typo an admin can see and fix,
 * whereas silently deleting it hides the mistake.
 */
export function renderPaymentPurpose(
  template: string | null | undefined,
  values: { reference: string; course: string },
): string {
  const fallback = `Uplata za obuku ${values.course} — ${values.reference}`;
  if (!template?.trim()) return fallback;

  return template.replaceAll('{reference}', values.reference).replaceAll('{course}', values.course);
}
