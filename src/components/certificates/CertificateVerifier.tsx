'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormTextField from '@/components/form/FormTextField';
import DetailList from '@/components/data/DetailList';
import { useVerifyCertificate } from '@/hooks/useCertificates';
import { useZodForm } from '@/lib/forms/useZodForm';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { formatDate } from '@/lib/format';
import type { CertificateVerification } from '@/lib/schemas/certificates.schema';
import {
  certificateVerificationFormSchema,
  toVerifyCertificatePayload,
  type CertificateVerificationFormValues,
} from '@/lib/schemas/certificate-verification-form.schema';
import { toast } from '@/store/useToastStore';

type Outcome =
  { kind: 'found'; certificate: CertificateVerification } | { kind: 'missing'; message: string };

/**
 * The public certificate check: number + surname in, a yes or a no out.
 *
 * A miss (404) is an *answer*, not a failure, so it is caught and shown as an
 * outcome below the form rather than thrown into `<Form>`'s error alert. Any
 * other error (429, offline, 500) is thrown as usual.
 *
 * When the page was opened from a shared link with both fields filled in, the
 * check runs once on its own — the person following the link came to see the
 * result, not to press a button.
 */
export default function CertificateVerifier({
  initialNumber = '',
  initialSurname = '',
}: {
  initialNumber?: string;
  initialSurname?: string;
}) {
  const { mutateAsync: verify } = useVerifyCertificate();
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);

  const form = useZodForm(certificateVerificationFormSchema, {
    defaultValues: { number: initialNumber, surname: initialSurname },
  });

  /** Runs the check and returns the answer; only other errors throw. */
  const check = React.useCallback(
    async (values: CertificateVerificationFormValues): Promise<Outcome> => {
      try {
        const certificate = await verify(toVerifyCertificatePayload(values));
        return { kind: 'found', certificate };
      } catch (error) {
        if (!isStatus(error, 404)) throw error;
        return { kind: 'missing', message: errorMessage(error) };
      }
    },
    [verify],
  );

  // Run once for a prefilled link. A ref, not state, so React's dev-mode
  // double effect does not send the request twice.
  const autoRan = React.useRef(false);
  React.useEffect(() => {
    if (autoRan.current || !initialNumber || !initialSurname) return;
    autoRan.current = true;
    const parsed = certificateVerificationFormSchema.safeParse({
      number: initialNumber,
      surname: initialSurname,
    });
    if (!parsed.success) return;
    check(parsed.data).then(setOutcome, (error: unknown) => toast.error(errorMessage(error)));
  }, [initialNumber, initialSurname, check]);

  return (
    <Stack spacing={4}>
      <Form
        form={form}
        onSubmit={async (values) => {
          // Clear the previous answer so a stale "valid" never sits under new input.
          setOutcome(null);
          setOutcome(await check(values));
        }}
        pendingLabel="Provjera…"
      >
        <FormTextField
          name="number"
          label="Broj certifikata"
          placeholder="CERT-2026-0001"
          helperText="Otisnut je na dnu certifikata, pod „Broj certifikata”."
          required
        />
        <FormTextField
          name="surname"
          label="Prezime vlasnika"
          helperText="Kao na certifikatu. Kvačice nisu obavezne."
          required
        />
        <FormActions submitLabel="Provjeri" pendingLabel="Provjera…" />
      </Form>

      {outcome?.kind === 'found' ? (
        <Alert
          severity="success"
          icon={<VerifiedOutlinedIcon fontSize="inherit" />}
          sx={{ '& .MuiAlert-message': { width: '100%' } }}
        >
          <AlertTitle>Certifikat je važeći</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Izdala ga je ova platforma nakon što je polaznik završio sve module obuke.
          </Typography>
          <DetailList
            items={[
              { label: 'Broj certifikata', value: outcome.certificate.readable_id },
              { label: 'Izdan na ime', value: outcome.certificate.student_name },
              { label: 'Obuka', value: outcome.certificate.course_name },
              { label: 'Datum završetka', value: formatDate(outcome.certificate.issued_at) },
            ]}
          />
        </Alert>
      ) : null}

      {outcome?.kind === 'missing' ? (
        <Alert severity="warning">
          <AlertTitle>Nema podudaranja</AlertTitle>
          {outcome.message}
        </Alert>
      ) : null}
    </Stack>
  );
}
