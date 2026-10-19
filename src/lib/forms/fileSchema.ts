import { z } from 'zod';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_MESSAGE_ATTACHMENT_TYPES,
  ACCEPTED_MODULE_FILE_TYPES,
  ACCEPTED_TASK_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from '@/lib/storage';

/**
 * Zod schemas for file inputs.
 *
 * File pickers hand you a `File`, which zod can validate like anything else —
 * so size and type limits live in the schema next to every other rule rather
 * than as ad-hoc checks inside a change handler. The same limits are enforced
 * again by `/api/admin/uploads`; this copy exists to fail fast and explain
 * itself, not to be the security boundary.
 *
 * `z.instanceof(File)` is safe here because these schemas are only ever
 * evaluated in the browser, as part of a form.
 */
export function fileSchema({
  maxBytes = MAX_UPLOAD_BYTES,
  acceptedTypes,
  typeErrorMessage,
}: {
  maxBytes?: number;
  acceptedTypes?: readonly string[];
  typeErrorMessage?: string;
} = {}) {
  return z
    .instanceof(File, { message: 'Izaberite datoteku.' })
    .refine((file) => file.size > 0, { message: 'Izabrana datoteka je prazna.' })
    .refine((file) => file.size <= maxBytes, {
      message: `Datoteka je prevelika. Maksimalna veličina je ${formatBytes(maxBytes)}.`,
    })
    .refine((file) => !acceptedTypes || acceptedTypes.includes(file.type), {
      message: typeErrorMessage ?? 'Format datoteke nije podržan.',
    });
}

/** Image upload constrained to the formats the thumbnail/`<img>` pipeline handles. */
export const imageFileSchema = fileSchema({
  acceptedTypes: ACCEPTED_IMAGE_TYPES,
  typeErrorMessage: 'Dozvoljeni formati su JPG, PNG, WebP i AVIF.',
});

/**
 * A course material. PDF only — see the note on ACCEPTED_MODULE_FILE_TYPES for
 * why that is about being *displayable in-page*, not about being harder to copy.
 */
export const moduleFileSchema = fileSchema({
  acceptedTypes: ACCEPTED_MODULE_FILE_TYPES,
  typeErrorMessage: 'Materijali moraju biti PDF datoteke.',
});

/**
 * A file attached to a task brief. Unlike a module material this is meant to be
 * downloaded and worked on, so the format list is wider — see
 * ACCEPTED_TASK_FILE_TYPES.
 */
export const taskFileSchema = fileSchema({
  acceptedTypes: ACCEPTED_TASK_FILE_TYPES,
  typeErrorMessage: 'Dozvoljeni formati su PDF, ZIP, TXT, CSV i slike.',
});

/**
 * A file attached to one message in a submission thread. Evidence of work, so
 * documents and images are both fair game — see ACCEPTED_MESSAGE_ATTACHMENT_TYPES.
 */
export const messageAttachmentSchema = fileSchema({
  acceptedTypes: ACCEPTED_MESSAGE_ATTACHMENT_TYPES,
  typeErrorMessage: 'Dozvoljeni formati su PDF, ZIP, TXT i slike (JPG, PNG, WebP, AVIF).',
});
