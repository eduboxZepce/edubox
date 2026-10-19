'use client';

import { useController, type FieldValues, type FieldPath } from 'react-hook-form';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

/**
 * A boolean toggle bound to a form field.
 *
 * Prefer a switch over a checkbox for settings that take effect on save and
 * read as on/off — `published`, `requested_delivery`. `description` is worth
 * filling in whenever the consequence isn't obvious from the label alone.
 *
 *   <FormSwitch
 *     name="published"
 *     label="Objavljen"
 *     description="Objavljene obuke su vidljive svim posjetiocima."
 *   />
 */
export default function FormSwitch<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  disabled = false,
}: {
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const { field, fieldState } = useController<TFieldValues>({ name });

  return (
    <Stack spacing={0.25}>
      <FormControlLabel
        control={
          <Switch
            name={field.name}
            // MUI v9 removed the `inputRef` prop — the ref goes to the input
            // slot instead, which is what react-hook-form focuses on error.
            slotProps={{ input: { ref: field.ref } }}
            onBlur={field.onBlur}
            // A boolean field with no default is `undefined`, which would make
            // the switch uncontrolled — coerce it to a real boolean.
            checked={Boolean(field.value)}
            onChange={(event) => field.onChange(event.target.checked)}
            disabled={disabled || field.disabled}
          />
        }
        label={
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>
        }
        sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5, '& .MuiSwitch-root': { mt: 0.25 } }}
      />

      {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
    </Stack>
  );
}
