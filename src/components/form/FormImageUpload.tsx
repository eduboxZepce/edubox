'use client';

import * as React from 'react';
import { useController, type FieldValues, type FieldPath } from 'react-hook-form';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_MAX_DIMENSION,
  MAX_IMAGE_SOURCE_BYTES,
  formatBytes,
} from '@/lib/storage';

/**
 * An image picker whose form value is the selected `File` (or `null`).
 *
 * Note what it deliberately does *not* do: it never uploads anything. Keeping
 * selection and upload separate is what lets the page decide the order —
 * a course, for instance, has to exist before its thumbnail has a folder to
 * live in, so the upload happens after the create call succeeds.
 *
 * Size and format are validated by the schema (`imageFileSchema`), so an
 * oversized file surfaces as a normal field error rather than a failed request.
 * The picked file is resized when it is uploaded (`compressImage`), so the size
 * shown here is the original's, not what will be stored.
 *
 *   <FormImageUpload
 *     name="thumbnail"
 *     label="Naslovna slika"
 *     currentImageUrl={courseThumbnailUrl(course.thumbnail_path)}
 *   />
 */
export default function FormImageUpload<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  helperText,
  /** Already-saved image, shown until the user picks a replacement. */
  currentImageUrl,
  disabled = false,
}: {
  name: FieldPath<TFieldValues>;
  label: string;
  helperText?: string;
  currentImageUrl?: string | null;
  disabled?: boolean;
}) {
  const { field, fieldState } = useController<TFieldValues>({ name });
  const inputRef = React.useRef<HTMLInputElement>(null);

  // `field.value` is typed from the form's shape, which the generic default
  // widens to `any`/`never` depending on the caller — narrow it explicitly.
  const value: unknown = field.value;
  const file: File | null = value instanceof File ? value : null;

  // The preview URL is *derived* from the selected file, so it's computed during
  // render rather than stored in state and synced by an effect — the latter
  // renders twice for every pick and is what `react-hooks/set-state-in-effect`
  // exists to prevent.
  const previewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // A blob URL is a document-scoped resource, not a plain string: without this
  // the browser holds the whole file in memory for the life of the page. The
  // effect only cleans up — it sets no state.
  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownImage = previewUrl ?? currentImageUrl ?? null;

  function handleClear() {
    field.onChange(null);
    // Without this, picking the same file again fires no `change` event.
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <Stack spacing={1}>
      <FormLabel error={Boolean(fieldState.error)} sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
        {label}
      </FormLabel>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 168,
            height: 112,
            flexShrink: 0,
            borderRadius: 1.5,
            border: 1,
            borderColor: fieldState.error ? 'error.main' : 'divider',
            borderStyle: shownImage ? 'solid' : 'dashed',
            bgcolor: 'action.hover',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            color: 'text.disabled',
          }}
        >
          {shownImage ? (
            // A plain <img>: next/image needs the Supabase host allow-listed in
            // next.config, and these are small, non-LCP admin previews.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownImage}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageOutlinedIcon />
          )}
        </Box>

        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1}>
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              disabled={disabled || field.disabled}
            >
              {file || currentImageUrl ? 'Promijeni sliku' : 'Izaberi sliku'}
              <input
                ref={inputRef}
                type="file"
                hidden
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
              />
            </Button>

            {file ? (
              <Button
                size="small"
                color="inherit"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleClear}
                disabled={disabled}
              >
                Ukloni
              </Button>
            ) : null}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {file
              ? `${file.name} · ${formatBytes(file.size)}`
              : `JPG, PNG, WebP ili AVIF · do ${formatBytes(MAX_IMAGE_SOURCE_BYTES)} · smanjuje se na ${IMAGE_MAX_DIMENSION} px`}
          </Typography>
        </Stack>
      </Stack>

      {(fieldState.error?.message ?? helperText) ? (
        <FormHelperText error={Boolean(fieldState.error)} sx={{ mx: 0 }}>
          {fieldState.error?.message ?? helperText}
        </FormHelperText>
      ) : null}
    </Stack>
  );
}
