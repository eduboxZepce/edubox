import { z } from 'zod';

/**
 * Post /api/contact - the public contact form.
 *
 * Kept deliberately small: name, email, subject, message. No auth, no
 * relation to any other table - this only ever becomes an email.
 */
export const contactRequestSchema = z.object({
  name: z.string().trim().min(1, 'Ime je obavezno').max(200),
  email: z.string().trim().email('Email adresa nije ispravna').max(320),
  subject: z.string().trim().min(1, 'Tema je obavezna').max(200),
  message: z.string().trim().min(1, 'Poruka je obavezna').max(5000),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
