'use client';

import * as React from 'react';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useMarkCertificateDelivered } from '@/hooks/useCertificates';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { AdminCertificate } from '@/lib/schemas/certificates.schema';

/**
 * "I have posted this" / "no I have not", for one certificate.
 *
 * Owns its own mutation and confirmation so the list row and the detail page
 * can both drop it in — the same shape as `PurchaseActions`.
 *
 * ## Only marking asks for confirmation
 *
 * Marking sent emails the student to say their certificate is on its way, and
 * an email cannot be recalled — so that direction is confirmed. Un-marking is
 * an admin correcting their own records and notifies nobody, so it just
 * happens. Confirming both would train people to click through the one that
 * matters.
 *
 * ## `compact` for the list, the full button for the detail page
 *
 * "Označi kao poslano" plus an icon is a wide control, and in a table cell it
 * dominated the row and pushed the useful columns together. In `compact` mode
 * it collapses to an icon button with the same label as its tooltip, so the
 * table keeps its shape while the action stays one click away. The detail page,
 * where the action *is* the point of the screen, keeps the labelled button.
 */
export default function CertificateDeliveryActions({
  certificate,
  size = 'small',
  compact = false,
}: {
  certificate: AdminCertificate;
  size?: 'small' | 'medium';
  /** Icon-only, for table rows. */
  compact?: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const mark = useMarkCertificateDelivered();

  const delivered = Boolean(certificate.delivered_at);

  async function setDelivered(next: boolean) {
    try {
      await mark.mutateAsync({ id: certificate.id, delivered: next });
      toast.success(next ? 'Označeno kao poslano.' : 'Oznaka slanja je uklonjena.');
      setConfirming(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (delivered) {
    if (compact) {
      return (
        <Tooltip title="Poništi oznaku slanja">
          {/* A disabled button swallows pointer events, so the tooltip needs a
              wrapper that still receives them. */}
          <span>
            <IconButton
              size={size}
              onClick={() => void setDelivered(false)}
              disabled={mark.isPending}
              aria-label="Poništi oznaku slanja"
            >
              <UndoOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    return (
      <Button
        size={size}
        color="inherit"
        startIcon={<UndoOutlinedIcon />}
        onClick={() => void setDelivered(false)}
        disabled={mark.isPending}
      >
        Poništi oznaku
      </Button>
    );
  }

  return (
    <>
      {compact ? (
        <Tooltip title="Označi kao poslano">
          <span>
            <IconButton
              size={size}
              color="primary"
              onClick={() => setConfirming(true)}
              disabled={mark.isPending}
              aria-label="Označi kao poslano"
            >
              <LocalShippingOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          size={size}
          variant="contained"
          startIcon={<LocalShippingOutlinedIcon />}
          onClick={() => setConfirming(true)}
          disabled={mark.isPending}
        >
          Označi kao poslano
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        title="Označiti certifikat kao poslan?"
        description="Zabilježit ćemo datum slanja i vas kao osobu koja je poslala. Student dobiva obavještenje da je certifikat na putu, pa ovo uradite tek kada je pošiljka stvarno predana."
        confirmLabel="Označi kao poslano"
        severity="primary"
        pending={mark.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void setDelivered(true)}
      />
    </>
  );
}
