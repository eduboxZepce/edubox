'use client';

import * as React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { messageAttachmentSchema } from '@/lib/forms/fileSchema';
import { MAX_UPLOAD_BYTES, formatBytes } from '@/lib/storage';
import { toast } from '@/store/useToastStore';

/**
 * Writing one message in a submission thread: a body, and optionally one file.
 *
 * Shared by the first submission and every reply, because they are the same
 * control — what differs is only what the *caller* does with the result, and
 * that difference is real (see `TaskWorkspace`): a reply can upload before
 * posting, while the first message cannot, because the upload path is keyed on
 * a submission that does not exist yet.
 *
 * `onSend` throwing means "not sent": the text and the chosen file stay put so
 * nothing is lost to a failed request, or to a reviewer backing out of the
 * approval dialog. The caller reports the reason.
 *
 * The file is validated here and handed back unchanged; this component never
 * uploads anything itself. Keeping the transport in the caller is what lets one
 * composer serve two genuinely different sequences.
 *
 * One attachment per message, matching the column — `task_messages` has a single
 * `attachment_path`, not a list.
 */
export default function MessageComposer({
  label,
  placeholder,
  submitLabel,
  pending,
  rows = 4,
  onSend,
}: {
  label: string;
  placeholder?: string;
  submitLabel: string;
  pending: boolean;
  rows?: number;
  onSend: (body: string, file: File | null) => Promise<void>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [body, setBody] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);

  function handlePick(picked: FileList | null) {
    const chosen = picked?.[0];
    if (!chosen) return;

    const parsed = messageAttachmentSchema.safeParse(chosen);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Datoteka nije prihvaćena.');
    } else {
      setFile(chosen);
    }

    // Clear the input either way, so re-picking the same file still fires.
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSend() {
    try {
      await onSend(body.trim(), file);
    } catch {
      // Swallowed on purpose. Reporting the failure is the caller's job — it
      // knows what went wrong; keeping the typed text is this component's, and
      // a throw is how the caller says "not sent". Without the catch the
      // rejection escapes the click handler entirely and goes unhandled.
      return;
    }

    setBody('');
    setFile(null);
  }

  return (
    <Stack spacing={1.5}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        multiline
        rows={rows}
        disabled={pending}
      />

      {file ? (
        <Box>
          <Chip
            icon={<AttachFileIcon />}
            label={`${file.name} · ${formatBytes(file.size)}`}
            onDelete={pending ? undefined : () => setFile(null)}
            deleteIcon={<CloseIcon />}
            variant="outlined"
          />
        </Box>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<AttachFileIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {file ? 'Zamijeni prilog' : 'Dodaj prilog'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            PDF, ZIP, TXT ili slika, do {formatBytes(MAX_UPLOAD_BYTES)}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={body.length === 0 || pending}
          onClick={() => void handleSend()}
          sx={{ flexShrink: 0 }}
        >
          {pending ? 'Slanje…' : submitLabel}
        </Button>
      </Stack>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.zip,.txt,image/*"
        onChange={(event) => handlePick(event.target.files)}
      />
    </Stack>
  );
}
