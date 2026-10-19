import { z } from 'zod';
import {
  CERTIFICATE_NUMBER_PATTERN,
  normalizeCertificateNumber,
} from '@/lib/certificateVerification';
import type { VerifyCertificateRequest } from './certificates.schema';

/**
 * The public certificate check — number and surname.
 *
 * The number's format is checked here, for a helpful message while typing;
 * the API does not check it as strictly (a malformed number is just a miss
 * there). Case and spaces are forgiven before the check, matching the route.
 */
export const certificateVerificationFormSchema = z.object({
  number: z
    .string({ error: 'Unesite broj certifikata.' })
    .transform(normalizeCertificateNumber)
    .pipe(
      z
        .string()
        .min(1, 'Unesite broj certifikata.')
        .regex(CERTIFICATE_NUMBER_PATTERN, 'Broj ima oblik CERT-2026-0001.'),
    ),
  surname: z
    .string({ error: 'Unesite prezime.' })
    .trim()
    .min(2, 'Unesite prezime vlasnika certifikata.')
    .max(100, 'Prezime može imati najviše 100 znakova.'),
});

export type CertificateVerificationFormValues = z.output<typeof certificateVerificationFormSchema>;
export type CertificateVerificationFormInput = z.input<typeof certificateVerificationFormSchema>;

/** Form values → `POST /api/certificates/verify` body. */
export function toVerifyCertificatePayload(
  values: CertificateVerificationFormValues,
): VerifyCertificateRequest {
  return { number: values.number, surname: values.surname };
}
