'use client';

import * as React from 'react';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useUpdatePurchase } from '@/hooks/usePurchases';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatPrice } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { AdminPurchase, UpdatePurchaseRequest } from '@/lib/schemas/purchases.schema';

type Action = UpdatePurchaseRequest['status'];

/**
 * The status moves an admin can make on one purchase.
 *
 *   requested → Odobri / Odbij
 *   approved  → Opozovi pristup
 *   revoked   → Vrati pristup
 *
 * Owns its own mutation and confirmations so the purchases list, its detail
 * page and the user detail page can all drop it in without knowing how the
 * transition works — the same split as `CourseActions`. The route enforces the
 * same table (`PURCHASE_TRANSITIONS`); this only decides which buttons appear.
 *
 * Every action is confirmed. Approving grants paid content and revoking takes
 * it away mid-course, so neither is less consequential than refusing.
 */
export default function PurchaseActions({
  purchase,
  size = 'small',
}: {
  purchase: AdminPurchase;
  size?: 'small' | 'medium';
}) {
  const [pendingAction, setPendingAction] = React.useState<Action | null>(null);
  const updatePurchase = useUpdatePurchase();

  // A denied request is closed; the student sends a new one instead.
  if (purchase.status === 'denied') return null;

  const courseName = purchase.courses?.name ?? 'ovu obuku';
  const studentName = purchase.profiles?.full_name ?? 'Student';
  const restoring = purchase.status === 'revoked';

  async function handleConfirm() {
    if (!pendingAction) return;

    try {
      await updatePurchase.mutateAsync({ id: purchase.id, body: { status: pendingAction } });
      toast.success(SUCCESS[pendingAction](studentName, restoring));
      setPendingAction(null);
    } catch (error) {
      // Dialog stays open so the admin can retry or back out deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        {purchase.status === 'requested' ? (
          <>
            <Button
              size={size}
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => setPendingAction('approved')}
            >
              Odobri
            </Button>
            <Button
              size={size}
              variant="outlined"
              color="error"
              startIcon={<CloseIcon />}
              onClick={() => setPendingAction('denied')}
            >
              Odbij
            </Button>
          </>
        ) : null}

        {purchase.status === 'approved' ? (
          <Button
            size={size}
            variant="outlined"
            color="error"
            startIcon={<BlockIcon />}
            onClick={() => setPendingAction('revoked')}
          >
            Opozovi pristup
          </Button>
        ) : null}

        {restoring ? (
          <Button
            size={size}
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => setPendingAction('approved')}
          >
            Vrati pristup
          </Button>
        ) : null}
      </Stack>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? TITLE[pendingAction](restoring) : ''}
        description={
          <Typography variant="body2" component="span">
            {pendingAction === 'denied' ? (
              <>
                Zahtjev korisnika <strong>{studentName}</strong> za obuku{' '}
                <strong>{courseName}</strong> bit će odbijen. Korisnik može kasnije poslati novi
                zahtjev.
              </>
            ) : pendingAction === 'revoked' ? (
              <>
                <strong>{studentName}</strong> odmah gubi pristup modulima obuke{' '}
                <strong>{courseName}</strong>. Ništa se ne briše — napredak, predaje i certifikati
                ostaju sačuvani, a pristup možete kasnije vratiti.
              </>
            ) : restoring ? (
              <>
                <strong>{studentName}</strong> ponovo dobiva pristup obuci{' '}
                <strong>{courseName}</strong>, sa sačuvanim napretkom.
              </>
            ) : (
              <>
                <strong>{studentName}</strong> će dobiti pun pristup obuci{' '}
                <strong>{courseName}</strong> po cijeni {formatPrice(purchase.price)}. Odobrite tek
                nakon što je uplata potvrđena.
              </>
            )}
          </Typography>
        }
        confirmLabel={pendingAction ? CONFIRM_LABEL[pendingAction](restoring) : ''}
        severity={pendingAction === 'denied' || pendingAction === 'revoked' ? 'error' : 'primary'}
        pending={updatePurchase.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}

// Keyed by the target status; `restoring` separates "approve a request" from
// "give back access that was revoked", which share a target but not a meaning.
const TITLE: Record<Action, (restoring: boolean) => string> = {
  approved: (restoring) => (restoring ? 'Vratiti pristup?' : 'Odobriti pristup?'),
  denied: () => 'Odbiti zahtjev?',
  revoked: () => 'Opozvati pristup?',
};

const CONFIRM_LABEL: Record<Action, (restoring: boolean) => string> = {
  approved: (restoring) => (restoring ? 'Vrati pristup' : 'Odobri pristup'),
  denied: () => 'Odbij zahtjev',
  revoked: () => 'Opozovi pristup',
};

const SUCCESS: Record<Action, (studentName: string, restoring: boolean) => string> = {
  approved: (studentName, restoring) =>
    restoring
      ? `Pristup je vraćen — ${studentName} ponovo može otvoriti obuku.`
      : `Pristup je odobren — ${studentName} sada može otvoriti obuku.`,
  denied: () => 'Zahtjev je odbijen.',
  revoked: (studentName) => `Pristup je opozvan — ${studentName} više ne može otvoriti obuku.`,
};
