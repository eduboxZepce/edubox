'use client';

import * as React from 'react';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useUpdatePurchase } from '@/hooks/usePurchases';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatPrice } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { AdminPurchase } from '@/lib/schemas/purchases.schema';

/**
 * Approve / deny for one purchase request.
 *
 * Owns its own mutation and confirmations so both the list row and the detail
 * page can drop it in without either knowing how the transition works — the
 * same split as `CourseActions`.
 *
 * Both actions are confirmed, not just the denial: approving is what grants a
 * student access to paid content, which is no less consequential than refusing.
 * Neither is reversible through this UI — the `purchases` unique index blocks a
 * second open request once one is approved.
 */
export default function PurchaseActions({
  purchase,
  size = 'small',
}: {
  purchase: AdminPurchase;
  size?: 'small' | 'medium';
}) {
  const [pendingAction, setPendingAction] = React.useState<'approved' | 'denied' | null>(null);
  const updatePurchase = useUpdatePurchase();

  // Only a request that's still open can be decided.
  if (purchase.status !== 'requested') return null;

  const courseName = purchase.courses?.name ?? 'ovu obuku';
  const studentName = purchase.profiles?.full_name ?? 'Student';

  async function handleConfirm() {
    if (!pendingAction) return;

    try {
      await updatePurchase.mutateAsync({ id: purchase.id, body: { status: pendingAction } });
      toast.success(
        pendingAction === 'approved'
          ? `Pristup je odobren — ${studentName} sada može otvoriti obuku.`
          : 'Zahtjev je odbijen.',
      );
      setPendingAction(null);
    } catch (error) {
      // Dialog stays open so the admin can retry or back out deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
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
      </Stack>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === 'denied' ? 'Odbiti zahtjev?' : 'Odobriti pristup?'}
        description={
          pendingAction === 'denied' ? (
            <Typography variant="body2" component="span">
              Zahtjev korisnika <strong>{studentName}</strong> za obuku{' '}
              <strong>{courseName}</strong> bit će odbijen. Korisnik može kasnije poslati novi
              zahtjev.
            </Typography>
          ) : (
            <Typography variant="body2" component="span">
              <strong>{studentName}</strong> će dobiti pun pristup obuci{' '}
              <strong>{courseName}</strong> po cijeni {formatPrice(purchase.price)}. Odobrite tek
              nakon što je uplata potvrđena.
            </Typography>
          )
        }
        confirmLabel={pendingAction === 'denied' ? 'Odbij zahtjev' : 'Odobri pristup'}
        severity={pendingAction === 'denied' ? 'error' : 'primary'}
        pending={updatePurchase.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
