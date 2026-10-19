'use client';

import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRequestCertificateDelivery } from '@/hooks/useCertificates';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatDate } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { Certificate } from '@/lib/schemas/certificates.schema';

/**
 * The student's half of the printed-certificate exchange.
 *
 * Three states, matching `deliveryStatus()`: nothing asked, asked and waiting,
 * and posted. The admin's half is `<CertificateDeliveryActions>`, and the two
 * write different columns through different endpoints on purpose — see the
 * note on `PATCH /api/admin/certificates/:id`.
 *
 * Only ever rendered for the certificate's owner. The page decides that; this
 * component would happily render for anyone, and the endpoint is what actually
 * refuses (`request-delivery` checks ownership with the caller's own client).
 */
export default function CertificateDelivery({ certificate }: { certificate: Certificate }) {
  const request = useRequestCertificateDelivery();

  if (certificate.delivered_at) {
    return (
      <Alert severity="success" icon={<LocalShippingOutlinedIcon fontSize="inherit" />}>
        <AlertTitle>Štampani certifikat je poslan</AlertTitle>
        Poslano {formatDate(certificate.delivered_at)}. Ako pošiljka ne stigne u razumnom roku,
        javite nam se.
      </Alert>
    );
  }

  if (certificate.requested_delivery) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="info" icon={<LocalShippingOutlinedIcon fontSize="inherit" />}>
          <AlertTitle>Zahtjev je poslan</AlertTitle>
          Tražili ste štampani primjerak. Javit ćemo vam kada bude poslan poštom.
        </Alert>
        {/* Withdrawing is allowed and notifies nobody — it just takes the row
            off the admin's queue. Same endpoint, `requested_delivery: false`. */}
        <Stack direction="row">
          <Button
            size="small"
            color="inherit"
            disabled={request.isPending}
            onClick={() => {
              request.mutate(
                { certificateId: certificate.id, requestedDelivery: false },
                {
                  onSuccess: () => toast.success('Zahtjev je povučen.'),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              );
            }}
          >
            Povuci zahtjev
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Želite certifikat i u štampanom obliku? Pošaljite zahtjev i poslat ćemo vam ga poštom.
      </Typography>
      <Stack direction="row">
        <Button
          variant="outlined"
          startIcon={<LocalShippingOutlinedIcon />}
          disabled={request.isPending}
          onClick={() => {
            request.mutate(
              { certificateId: certificate.id },
              {
                onSuccess: () => toast.success('Zahtjev za štampani certifikat je poslan.'),
                onError: (error) => toast.error(errorMessage(error)),
              },
            );
          }}
        >
          {request.isPending ? 'Slanje…' : 'Zatraži štampani primjerak'}
        </Button>
      </Stack>
    </Stack>
  );
}
