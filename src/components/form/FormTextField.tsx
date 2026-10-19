'use client';

import { useController, type FieldValues, type FieldPath } from 'react-hook-form';
import TextField from '@mui/material/TextField';

/**
 * A text input bound to a form field by name.
 *
 * It finds the form through `<FormProvider>` (rendered by `<Form>`), so all it
 * needs is the field's `name` — no `value`, no `onChange`, no error wiring.
 * Validation messages come from the zod schema automatically.
 *
 *   <FormTextField name="name" label="Naziv obuke" required />
 *   <FormTextField name="description" label="Opis" multiline rows={5} />
 *
 * `required` here is purely visual (it renders the asterisk); whether a field is
 * actually required is decided by the schema, so the two can't drift into
 * disagreeing about validation.
 */
export default function FormTextField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  helperText,
  placeholder,
  type = 'text',
  multiline = false,
  rows,
  required = false,
  disabled = false,
  autoComplete,
}: {
  name: FieldPath<TFieldValues>;
  label: string;
  /** Shown below the field until a validation error replaces it. */
  helperText?: string;
  placeholder?: string;
  /** `date` yields an ISO `yyyy-mm-dd` string, which is what a `date` column takes. */
  type?: 'text' | 'email' | 'password' | 'url' | 'date';
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const { field, fieldState } = useController<TFieldValues>({ name });

  return (
    <TextField
      {...field}
      // An optional field is `undefined` before it's touched, which would make
      // MUI treat the input as uncontrolled and warn on the first keystroke.
      value={field.value ?? ''}
      label={label}
      type={type}
      multiline={multiline}
      rows={multiline ? (rows ?? 4) : undefined}
      placeholder={placeholder}
      required={required}
      disabled={disabled || field.disabled}
      autoComplete={autoComplete}
      error={Boolean(fieldState.error)}
      helperText={fieldState.error?.message ?? helperText}
      // Reserve the helper-text line so the layout doesn't jump when an error
      // appears under a field.
      slotProps={{
        formHelperText: { sx: { minHeight: 20, mx: 0 } },
        // A date input always shows its own dd.mm.yyyy mask, so an unshrunk
        // label would sit on top of it.
        ...(type === 'date' ? { inputLabel: { shrink: true } } : null),
      }}
    />
  );
}
