'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useFormContext } from 'react-hook-form';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

/**
 * The button row that closes a form.
 *
 * It reads `isSubmitting` from form context rather than taking a `pending`
 * prop, so the submit button can never be left enabled during a save by
 * someone forgetting to pass it down.
 *
 *   <FormActions submitLabel="Kreiraj obuku" cancelHref="/admin/courses" />
 *
 * The submit button stays enabled while the form is invalid on purpose:
 * disabling it hides *why* nothing happens, whereas clicking runs validation
 * and focuses the first field with an error.
 */
export default function FormActions({
  submitLabel = 'Sačuvaj',
  /** Shown on the submit button while submitting. Not every form saves. */
  pendingLabel = 'Čuvanje…',
  cancelLabel = 'Otkaži',
  /** Renders the cancel button as a link. Omit both cancel props to hide it. */
  cancelHref,
  onCancel,
  /** Extra controls (e.g. "Save as draft"), rendered left of the main pair. */
  secondaryActions,
}: {
  submitLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  cancelHref?: string;
  onCancel?: () => void;
  secondaryActions?: React.ReactNode;
}) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  const showCancel = Boolean(cancelHref || onCancel);

  return (
    <Stack spacing={3}>
      <Divider />
      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
      >
        {secondaryActions ? (
          <Stack direction="row" spacing={1.5} sx={{ mr: 'auto' }}>
            {secondaryActions}
          </Stack>
        ) : null}

        {showCancel ? (
          <Button
            color="inherit"
            disabled={isSubmitting}
            {...(cancelHref ? { component: NextLink, href: cancelHref } : { onClick: onCancel })}
          >
            {cancelLabel}
          </Button>
        ) : null}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
