import { z } from '@/lib/openapi/zod';
import {
  auditFields,
  embeddedCourseSchema,
  embeddedProfileSchema,
  paginatedResponse,
  paginationQuerySchema,
  uuidSchema,
} from './common.schema';

export const purchaseStatusSchema = z
  .enum(['requested', 'denied', 'approved', 'revoked'])
  .openapi('PurchaseStatus');

export const purchaseSchema = z
  .object({
    id: uuidSchema,
    /**
     * The payment reference (UPL-YYYY-NNNN) the student quotes when they
     * transfer the money, and what an admin matches against a bank statement
     * before approving. Generated in the database; unique and never reused.
     */
    readable_id: z.string().openapi({ example: 'UPL-2026-0001' }),
    student_id: uuidSchema,
    course_id: uuidSchema,
    price: z.coerce.number().openapi({ description: 'Price snapshot at request time' }),
    status: purchaseStatusSchema,
    /**
     * `/api/purchases` embeds the course, and the student dashboard depends on
     * it: an approved purchase *is* the enrolment, so this is what turns the
     * list into "my courses" with names, thumbnails and links.
     */
    courses: embeddedCourseSchema,
    ...auditFields,
  })
  .openapi('Purchase');

/**
 * A purchase as the admin endpoints return it — with the course and student
 * rows embedded, which is what lets the admin UI show names instead of uuids.
 *
 * Only `profiles` separates this from `purchaseSchema` now — every route
 * embeds the same course projection. The student endpoint deliberately does not
 * embed the student: it is always the caller.
 */
export const adminPurchaseSchema = purchaseSchema
  .extend({
    profiles: embeddedProfileSchema,
  })
  .openapi('AdminPurchase');

export const adminPurchaseListResponseSchema = paginatedResponse(adminPurchaseSchema).openapi(
  'AdminPurchaseListResponse',
);

export const adminPurchaseResponseSchema = z
  .object({ data: adminPurchaseSchema })
  .openapi('AdminPurchaseResponse');

export const listPurchasesQuerySchema = paginationQuerySchema
  .extend({
    status: purchaseStatusSchema.optional(),
    courseId: uuidSchema.optional(),
    studentId: uuidSchema.optional().openapi({ description: 'Admin-only filter' }),
  })
  .openapi('ListPurchasesQuery');

// `search` comes from `paginationQuerySchema`; on purchases it matches the
// payment reference, which is the only free-text handle a purchase has.

export const purchaseListResponseSchema =
  paginatedResponse(purchaseSchema).openapi('PurchaseListResponse');

export const purchaseResponseSchema = z
  .object({ data: purchaseSchema })
  .openapi('PurchaseResponse');

/**
 * A student supplies only the course — price is snapshotted server-side from
 * the course record, and status is always 'requested'. Accepting either from
 * the client would let a student buy at a price they chose.
 */
export const createPurchaseSchema = z
  .object({
    course_id: uuidSchema,
  })
  .openapi('CreatePurchaseRequest');

/**
 * The status an admin moves a purchase to. Which moves are legal depends on
 * where it stands now — see `PURCHASE_TRANSITIONS` in the route.
 */
export const updatePurchaseSchema = z
  .object({
    status: z.enum(['approved', 'denied', 'revoked']),
  })
  .openapi('UpdatePurchaseRequest');

export type Purchase = z.infer<typeof purchaseSchema>;
export type AdminPurchase = z.infer<typeof adminPurchaseSchema>;
export type PurchaseStatus = z.infer<typeof purchaseStatusSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
export type CreatePurchaseRequest = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseRequest = z.infer<typeof updatePurchaseSchema>;
