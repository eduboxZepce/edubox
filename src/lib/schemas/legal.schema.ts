import { z } from '@/lib/openapi/zod';

/**
 * The terms and privacy texts (migration 0030), editable by an admin without a
 * deploy.
 *
 * Deliberately *not* the blog treatment. The blog is a typed array in the repo
 * because publishing there should be a code review — but a privacy policy
 * changes in response to a lawyer or a regulator, sometimes urgently, and
 * needing a release to correct one is the wrong trade.
 */
export const legalSlugSchema = z.enum(['terms', 'privacy']).openapi('LegalDocumentSlug');

export const legalDocumentSchema = z
  .object({
    slug: legalSlugSchema,
    title: z.string(),
    /** Markdown or plain text. Empty means "not written yet". */
    content: z.string(),
    updated_at: z.string(),
  })
  .openapi('LegalDocument');

export const updateLegalDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Naslov je obavezan.').max(200).optional(),
    content: z.string().max(100_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nema izmjena za čuvanje.',
  })
  .openapi('UpdateLegalDocumentRequest');

export const legalDocumentResponseSchema = z
  .object({ data: legalDocumentSchema })
  .openapi('LegalDocumentResponse');

export type LegalSlug = z.infer<typeof legalSlugSchema>;
export type LegalDocument = z.infer<typeof legalDocumentSchema>;
export type UpdateLegalDocumentRequest = z.infer<typeof updateLegalDocumentSchema>;
