import { z } from '@/lib/openapi/zod';
import {
  auditFields,
  embeddedProfileSchema,
  paginatedResponse,
  paginationQuerySchema,
  timestampSchema,
  uuidSchema,
} from './common.schema';

export const taskSubmissionStatusSchema = z
  .enum(['pending', 'needs_revision', 'approved'])
  .openapi('TaskSubmissionStatus');

export const taskMessageSchema = z
  .object({
    id: uuidSchema,
    submission_id: uuidSchema,
    sender_id: uuidSchema,
    body: z.string(),
    attachment_path: z.string().nullable().openapi({
      description: 'Object path in task-message-attachments: {submission_id}/{filename}',
    }),
    attachment_deleted_at: timestampSchema.nullable().openapi({
      description:
        'Set once the file was removed from storage (7 days after approval). The path stays so the name can still be shown.',
    }),
    ...auditFields,
  })
  .openapi('TaskMessage');

export const taskSubmissionSchema = z
  .object({
    id: uuidSchema,
    task_id: uuidSchema,
    student_id: uuidSchema,
    status: taskSubmissionStatusSchema,
    ...auditFields,
  })
  .openapi('TaskSubmission');

/**
 * The task a submission answers, with the module and course it belongs to.
 *
 * A submission row on its own says almost nothing a reviewer can act on — it is
 * three uuids and a status. The review screens need the brief that was set and
 * where it sits, so the admin endpoints embed the whole chain
 * (`task -> module -> course`) and this declares that shape.
 *
 * Nullable at every level for the usual reason: PostgREST omits a relation the
 * select did not ask for, so a page must never assume it is there.
 */
export const embeddedSubmissionTaskSchema = z
  .object({
    id: uuidSchema,
    // The brief itself. Carried on the *list* too, not only the detail, so both
    // screens share one select — see `ADMIN_SUBMISSION_SELECT`.
    text: z.string(),
    module_id: uuidSchema,
    modules: z
      .object({
        id: uuidSchema,
        title: z.string(),
        course_id: uuidSchema,
        courses: z
          .object({ id: uuidSchema, name: z.string(), slug: z.string() })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

/**
 * A submission as the admin endpoints return it: the student who sent it, the
 * task chain it belongs to, and how many messages the thread holds.
 *
 * `message_count` is flattened in the route — PostgREST delivers a `count`
 * embed as `task_messages: [{ count: n }]`, which no page should have to know.
 */
export const adminSubmissionSchema = taskSubmissionSchema
  .extend({
    profiles: embeddedProfileSchema,
    tasks: embeddedSubmissionTaskSchema,
    message_count: z.number().int(),
  })
  .openapi('AdminSubmission');

export const adminSubmissionListResponseSchema = paginatedResponse(adminSubmissionSchema).openapi(
  'AdminSubmissionListResponse',
);

export const adminSubmissionResponseSchema = z
  .object({ data: adminSubmissionSchema })
  .openapi('AdminSubmissionResponse');

export const listSubmissionsQuerySchema = paginationQuerySchema
  .extend({
    status: taskSubmissionStatusSchema.optional(),
    courseId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
  })
  .openapi('ListSubmissionsQuery');

export const submissionListResponseSchema =
  paginatedResponse(taskSubmissionSchema).openapi('SubmissionListResponse');

export const submissionResponseSchema = z
  .object({ data: taskSubmissionSchema })
  .openapi('SubmissionResponse');

export const messageListResponseSchema =
  paginatedResponse(taskMessageSchema).openapi('MessageListResponse');

export const createSubmissionSchema = z
  .object({
    body: z.string().trim().min(1).max(10000).openapi({ description: 'First message body' }),
    attachment_path: z.string().trim().optional(),
  })
  .openapi('CreateSubmissionRequest');

/**
 * `status` is honoured only when the sender is an admin — a student including
 * it is ignored rather than rejected, so the same endpoint serves both sides
 * of the thread.
 */
export const createMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(10000),
    attachment_path: z.string().trim().optional(),
    status: taskSubmissionStatusSchema.optional().openapi({
      description: 'Admin only — sets the submission status alongside the message',
    }),
  })
  .openapi('CreateMessageRequest');

/**
 * Attaching a file to a message that already exists.
 *
 * Separate from `createMessageSchema` because it answers a different question:
 * not "what is this message" but "the upload that could not happen before the
 * submission existed has now happened". See `PATCH /api/messages/:id`.
 */
export const updateMessageSchema = z
  .object({
    attachment_path: z.string().trim().min(1),
  })
  .openapi('UpdateMessageRequest');

export const createSubmissionResponseSchema = z
  .object({
    data: taskSubmissionSchema.extend({ message: taskMessageSchema }),
  })
  .openapi('CreateSubmissionResponse');

export const createMessageResponseSchema = z
  .object({
    data: taskMessageSchema,
    submission_status: taskSubmissionStatusSchema,
    module_completed: z.boolean(),
    certificate_issued: z.boolean(),
  })
  .openapi('CreateMessageResponse');

export type TaskSubmission = z.infer<typeof taskSubmissionSchema>;
export type AdminSubmission = z.infer<typeof adminSubmissionSchema>;
export type TaskSubmissionStatus = z.infer<typeof taskSubmissionStatusSchema>;
export type TaskMessage = z.infer<typeof taskMessageSchema>;
export type CreateSubmissionResponse = z.infer<typeof createSubmissionResponseSchema>;
export type CreateMessageResponse = z.infer<typeof createMessageResponseSchema>;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionSchema>;
export type CreateMessageRequest = z.infer<typeof createMessageSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type UpdateMessageRequest = z.infer<typeof updateMessageSchema>;
