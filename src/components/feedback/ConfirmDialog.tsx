'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

/**
 * Confirmation prompt for destructive or irreversible actions.
 *
 * Controlled on purpose — the caller owns `open` and the mutation, so the
 * dialog can show that mutation's pending state and stay open if it fails.
 *
 *   const [confirming, setConfirming] = React.useState(false);
 *   const remove = useDeleteCourse();
 *
 *   <ConfirmDialog
 *     open={confirming}
 *     title="Obrisati obuku?"
 *     description="Svi moduli, kvizovi i zadaci bit će trajno obrisani."
 *     confirmLabel="Obriši"
 *     pending={remove.isPending}
 *     onCancel={() => setConfirming(false)}
 *     onConfirm={async () => {
 *       await remove.mutateAsync(course.id);
 *       setConfirming(false);
 *     }}
 *   />
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Potvrdi',
  cancelLabel = 'Otkaži',
  /** `error` for deletions, `primary` for benign confirmations. */
  severity = 'error',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'error' | 'primary';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      // Closing mid-request would leave the user with no feedback on an action
      // that is still going to happen.
      onClose={pending ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>

      {description ? (
        <DialogContent>
          <DialogContentText component="div">{description}</DialogContentText>
        </DialogContent>
      ) : null}

      <DialogActions sx={{ px: 3, pb: 3, pt: description ? 0 : 1, gap: 1 }}>
        <Button onClick={onCancel} disabled={pending} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={pending} variant="contained" color={severity}>
          {pending ? 'Obrada…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
