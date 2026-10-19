import { z } from '@/lib/openapi/zod';
import {
  auditFields,
  booleanQueryParam,
  embeddedCourseSchema,
  embeddedProfileSchema,
  paginatedResponse,
  paginationQuerySchema,
  timestampSchema,
  uuidSchema,
} from './common.schema';
import { CERTIFICATE_NUMBER_PATTERN } from '@/lib/certificateVerification';

export const readableIdSchema = z
  .string()
  .regex(CERTIFICATE_NUMBER_PATTERN)
  .openapi({ example: 'CERT-2026-0001' });

export const certificateSchema = z
  .object({
    id: uuidSchema,
    course_id: uuidSchema,
    student_id: uuidSchema,
    readable_id: readableIdSchema,
    requested_delivery: z.boolean(),
    /**
     * When an admin marked the printed copy as posted; null means not sent.
     *
     * A timestamp rather than a boolean because "when" is the question an admin
     * chasing a complaint actually has, and a nullable timestamp answers both.
     */
    delivered_at: timestampSchema.nullable(),
    delivered_by: uuidSchema.nullable(),
    /** `/api/certificates` embeds the course so the student sees its name. */
    courses: embeddedCourseSchema,
    ...auditFields,
  })
  .openapi('Certificate');

/** A certificate as the admin endpoints return it, with course + student embedded. */
export const adminCertificateSchema = certificateSchema
  .extend({
    profiles: embeddedProfileSchema,
    /**
     * Who marked it posted. Aliased in the select because `certificates` has
     * two foreign keys into `profiles` now, and a bare `profiles(...)` embed
     * would be ambiguous.
     */
    deliverer: z.object({ id: uuidSchema, full_name: z.string() }).nullable().optional(),
  })
  .openapi('AdminCertificate');

export const adminCertificateListResponseSchema = paginatedResponse(adminCertificateSchema).openapi(
  'AdminCertificateListResponse',
);

export const adminCertificateResponseSchema = z
  .object({ data: adminCertificateSchema })
  .openapi('AdminCertificateResponse');

export const listCertificatesQuerySchema = paginationQuerySchema
  .extend({
    requestedDelivery: booleanQueryParam()
      .optional()
      .openapi({ description: 'Filter to certificates the student asked to be posted' }),
    delivered: booleanQueryParam()
      .optional()
      .openapi({ description: 'Filter on whether the printed copy has been posted' }),
    courseId: uuidSchema.optional(),
    studentId: uuidSchema.optional().openapi({ description: 'Admin-only filter' }),
  })
  .openapi('ListCertificatesQuery');

export const certificateListResponseSchema =
  paginatedResponse(certificateSchema).openapi('CertificateListResponse');

export const certificateResponseSchema = z
  .object({ data: certificateSchema })
  .openapi('CertificateResponse');

/**
 * `POST /api/certificates/verify` — the public check. Both fields are needed;
 * see `src/lib/certificateVerification.ts` for why the number alone is not.
 * The number is only length-checked here: a malformed one simply fails to
 * match, and answering it differently would tell a prober something.
 */
export const verifyCertificateRequestSchema = z
  .object({
    number: z.string().trim().min(1).max(40).openapi({ example: 'CERT-2026-0001' }),
    surname: z.string().trim().min(2).max(100).openapi({ example: 'Begović' }),
  })
  .openapi('VerifyCertificateRequest');

/**
 * Public verification payload. Deliberately minimal: enough to confirm a
 * certificate is genuine, without exposing the certificates table or any
 * identifier that could be enumerated back into student data.
 */
export const certificateVerificationSchema = z
  .object({
    readable_id: readableIdSchema,
    student_name: z.string(),
    course_name: z.string(),
    issued_at: z.string().openapi({ format: 'date-time' }),
    valid: z.literal(true),
  })
  .openapi('CertificateVerification');

export const certificateVerificationResponseSchema = z
  .object({ data: certificateVerificationSchema })
  .openapi('CertificateVerificationResponse');

/**
 * The admin side of delivery: "I have posted this" / "no I have not".
 *
 * Separate from `requestDeliverySchema` because they are different people
 * answering different questions — the student asks, the admin fulfils — and
 * one schema covering both would let either write the other's column.
 */
export const markDeliveredSchema = z
  .object({
    delivered: z.boolean(),
  })
  .openapi('MarkCertificateDeliveredRequest');

export const requestDeliverySchema = z
  .object({
    requested_delivery: z.boolean().default(true),
  })
  .openapi('RequestDeliveryRequest');

export type Certificate = z.infer<typeof certificateSchema>;
export type AdminCertificate = z.infer<typeof adminCertificateSchema>;
export type ListCertificatesQuery = z.infer<typeof listCertificatesQuerySchema>;
export type CertificateVerification = z.infer<typeof certificateVerificationSchema>;
export type VerifyCertificateRequest = z.infer<typeof verifyCertificateRequestSchema>;
export type MarkCertificateDeliveredRequest = z.infer<typeof markDeliveredSchema>;
