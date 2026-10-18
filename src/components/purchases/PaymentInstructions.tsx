'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { usePaymentSettings } from '@/hooks/useSiteContent';
import { isPayable, renderPaymentPurpose } from '@/lib/schemas/payment.schema';
import { formatPrice } from '@/lib/format';
import { toast } from '@/store/useToastStore';

/**
 * Everything a student needs to actually make the transfer.
 *
 * ## The gap this closes
 *
 * 0028 gave a purchase a `readable_id` so an admin could reconcile a payment,
 * and the panel showed it. But the *other half* of a bank transfer — who to pay,
 * into which account — existed nowhere in the product. A student was told their
 * reference number and left to guess the rest, or to email and ask.
 *
 * ## Incomplete details say so
 *
 * `isPayable()` requires at least a name and an account number. Below that this
 * renders a notice instead of a half-empty table: a transfer form filled in from
 * partial details is a payment that goes nowhere and still has to be chased.
 */
function CopyableRow({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} — kopirano.`);
    } catch {
      toast.info('Kopiranje nije dozvoljeno — prepiši podatak ručno.');
    }
  }

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, width: 150 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
          {value}
        </Typography>
        <Tooltip title="Kopiraj">
          <IconButton size="small" onClick={() => void copy()} aria-label={`Kopiraj: ${label}`}>
            <ContentCopyIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

export default function PaymentInstructions({
  reference,
  courseName,
  price,
  showReference = true,
}: {
  /** The purchase's `readable_id`, quoted on the transfer. */
  reference: string;
  courseName: string;
  price: number;
  /**
   * Set false where `<PaymentReference>` already shows it as the headline —
   * the reference still appears inside "Svrha uplate", so nothing is lost and
   * the same number is not printed three times on one screen.
   */
  showReference?: boolean;
}) {
  const settings = usePaymentSettings();

  if (settings.isPending) {
    return <Skeleton variant="rounded" height={220} />;
  }

  if (settings.isError || !isPayable(settings.data)) {
    return (
      <Alert severity="info">
        Podaci za uplatu još nisu postavljeni. Javi nam se putem zahtjeva za podršku i poslat ćemo
        ti ih, a tvoj poziv na broj je <strong>{reference}</strong>.
      </Alert>
    );
  }

  const s = settings.data;

  // The seller's postal address, assembled from whichever parts exist — a
  // missing city should not leave a dangling comma.
  const addressLine = [s.address, [s.postal_code, s.city].filter(Boolean).join(' '), s.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');

  const purpose = renderPaymentPurpose(s.payment_purpose_template, {
    reference,
    course: courseName,
  });

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Uplatu izvrši na račun ispod. <strong>Obavezno navedi poziv na broj</strong> — po njemu
        prepoznajemo tvoju uplatu i odobravamo pristup kursu.
      </Typography>

      <Box
        sx={{
          p: 2,
          borderRadius: 1.5,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Stack spacing={1.25} divider={<Divider flexItem />}>
          {s.seller_name ? <CopyableRow label="Primalac" value={s.seller_name} /> : null}
          {addressLine ? <CopyableRow label="Adresa" value={addressLine} /> : null}
          {s.bank_name ? <CopyableRow label="Banka" value={s.bank_name} /> : null}
          {s.account_number ? <CopyableRow label="Broj računa" value={s.account_number} /> : null}
          {s.swift ? <CopyableRow label="SWIFT/BIC" value={s.swift} /> : null}
          {s.tax_id ? <CopyableRow label="ID broj" value={s.tax_id} /> : null}
          <CopyableRow label="Iznos" value={formatPrice(price)} />
          <CopyableRow label="Svrha uplate" value={purpose} />
          {/* Repeated on its own line even though it is inside the purpose:
              some bank forms have a dedicated reference field, and a student
              should not have to extract it from a sentence. */}
          {showReference ? <CopyableRow label="Poziv na broj" value={reference} /> : null}
        </Stack>
      </Box>

      {s.note ? (
        <Typography variant="body2" color="text.secondary">
          {s.note}
        </Typography>
      ) : null}
    </Stack>
  );
}
