'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { toast } from '@/store/useToastStore';

/**
 * The payment reference for one purchase request.
 *
 * Payment happens outside the app — the student transfers money by whatever
 * means and an admin approves once it lands. This string is the only thing
 * joining those two halves: the student quotes it on the transfer, the admin
 * searches for it when reconciling. Without it, two people buying the same
 * course for the same price are indistinguishable on a bank statement.
 *
 * Rendered in monospace and given a copy button because it exists to be
 * transcribed accurately into somebody's banking form, and a mistyped reference
 * is a payment nobody can match.
 */
export default function PaymentReference({
  readableId,
  variant = 'full',
}: {
  readableId: string;
  /** `full` explains what to do with it; `inline` is just the value. */
  variant?: 'full' | 'inline';
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(readableId);
      toast.success('Poziv na broj je kopiran.');
    } catch {
      // Clipboard access can be refused (permissions, insecure origin). The
      // number is on screen and selectable either way, so this is a nudge
      // rather than a failure.
      toast.info('Kopiranje nije dozvoljeno — prepiši broj ručno.');
    }
  }

  const value = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        component="code"
        sx={{
          fontFamily: 'monospace',
          fontSize: variant === 'full' ? 18 : 14,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        {readableId}
      </Box>
      <Tooltip title="Kopiraj">
        <IconButton size="small" onClick={() => void copy()} aria-label="Kopiraj poziv na broj">
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  if (variant === 'inline') return value;

  return (
    <Alert severity="info" icon={false}>
      <AlertTitle>Poziv na broj</AlertTitle>
      <Stack spacing={1}>
        {value}
        <Typography variant="body2" color="text.secondary">
          Navedi ovaj broj prilikom uplate. Po njemu prepoznajemo tvoju uplatu i odobravamo pristup
          kursu.
        </Typography>
      </Stack>
    </Alert>
  );
}
