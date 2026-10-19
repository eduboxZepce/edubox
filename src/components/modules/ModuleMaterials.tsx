'use client';

import * as React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useCreateModuleFile, useDeleteModuleFile } from '@/hooks/useModules';
import { useUploadFile } from '@/hooks/useUploads';
import { moduleFileSchema } from '@/lib/forms/fileSchema';
import { errorMessage } from '@/lib/api/errorMessage';
import { BUCKETS, MAX_UPLOAD_BYTES, formatBytes } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import type { ModuleFile } from '@/lib/schemas/modules.schema';

/**
 * Materials attached to one module — list, upload, delete.
 *
 * ## Why this is not part of `<ModuleForm>`
 *
 * Uploading is not a form field. A file is stored the moment it is chosen, and
 * deleting one removes it immediately; neither waits for "Sačuvaj", and neither
 * is undone by navigating away. Putting that inside the form would mean a
 * single button that saves some changes instantly and others on submit — the
 * kind of ambiguity that makes people click Save twice.
 *
 * So it sits beside the form on the page, the same way `CourseDeleteSection`
 * does: visually part of the screen, mechanically independent. The scaffold's
 * original note suggested embedding it in the form; this is a deliberate
 * departure, for the reason above.
 *
 * ## Why it only exists on the edit page
 *
 * The storage path is `{course_id}/{module_id}/{filename}` — the module id has
 * to exist before a file has anywhere to go. The create page therefore has no
 * materials section at all, and says so.
 *
 * ## The two-step save
 *
 *   1. `useUploadFile()` puts the bytes in the bucket and returns a path.
 *   2. `useCreateModuleFile()` records the row that makes it visible.
 *
 * Step 1 alone leaves an object no screen will ever show. If step 2 fails the
 * upload has already happened, so the message names the file that was not
 * attached rather than pretending nothing occurred.
 *
 * **Folder order is load-bearing.** The storage policy reads the *first* path
 * segment and checks `can_author_course()` against it. `[moduleId, courseId]`
 * would upload without error and then be unreadable by everyone, permanently.
 */
export default function ModuleMaterials({
  courseId,
  moduleId,
  files,
}: {
  courseId: string;
  moduleId: string;
  files: ModuleFile[];
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = React.useState<ModuleFile | null>(null);

  const uploadFile = useUploadFile();
  const createModuleFile = useCreateModuleFile();
  const deleteModuleFile = useDeleteModuleFile();

  const isUploading = uploadFile.isPending || createModuleFile.isPending;

  async function handleFiles(picked: FileList | null) {
    if (!picked?.length) return;

    // Sequential, not `Promise.all`: the endpoint takes one file per request,
    // and a serial loop keeps each error tied to the file that caused it.
    for (const file of Array.from(picked)) {
      const parsed = moduleFileSchema.safeParse(file);
      if (!parsed.success) {
        toast.error(
          `${file.name}: ${parsed.error.issues[0]?.message ?? 'Datoteka nije prihvaćena.'}`,
        );
        continue;
      }

      try {
        const { path } = await uploadFile.mutateAsync({
          bucket: BUCKETS.moduleFiles,
          // BOTH ids, course first — see the note above.
          folders: [courseId, moduleId],
          file,
        });

        await createModuleFile.mutateAsync({
          moduleId,
          body: { file_path: path, file_name: file.name },
        });

        toast.success(`Materijal "${file.name}" je dodan.`);
      } catch (error) {
        toast.error(`${file.name}: ${errorMessage(error)}`);
      }
    }

    // Clear the input so picking the same file again still fires `change`.
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteModuleFile.mutateAsync(deleting.id);
      toast.success('Materijal je obrisan.');
      setDeleting(null);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard
      title="Materijali"
      description="PDF materijali uz ovaj modul. Studenti ih pregledaju, ne preuzimaju."
      disablePadding
    >
      {isUploading ? <LinearProgress /> : null}

      {files.length === 0 ? (
        <Stack sx={{ px: 3, py: 4, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Ovaj modul još nema materijale.
          </Typography>
        </Stack>
      ) : (
        <Stack divider={<Divider />}>
          {files.map((file) => (
            <Stack
              key={file.id}
              direction="row"
              spacing={2}
              sx={{ px: 3, py: 1.5, alignItems: 'center' }}
            >
              <AttachFileIcon fontSize="small" sx={{ color: 'text.disabled' }} />

              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                {/* `file_name` is the original name the admin uploaded; the
                    stored path is timestamped and not worth showing. */}
                {file.file_name ?? file.file_path.split('/').pop()}
              </Typography>

              <Tooltip title="Obriši">
                <IconButton
                  size="small"
                  onClick={() => setDeleting(file)}
                  aria-label={`Obriši materijal ${file.file_name ?? ''}`}
                >
                  <DeleteOutlinedIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      )}

      <Divider />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ p: 2.5, alignItems: { sm: 'center' } }}
      >
        <Button
          variant="outlined"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          sx={{ flexShrink: 0 }}
        >
          {isUploading ? 'Učitavanje…' : 'Dodaj materijal'}
        </Button>

        <Typography variant="caption" color="text.secondary">
          Samo PDF, najviše {formatBytes(MAX_UPLOAD_BYTES)} po datoteci. Studenti materijale
          pregledaju u aplikaciji.
        </Typography>

        {/* Hidden on purpose: the styled MUI button is the control, while the
            real input stays in the DOM so the browser's own picker is used. */}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          // Filters the OS picker. The schema below and the upload route are
          // what actually enforce it — `accept` is a hint, not a check.
          accept="application/pdf"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </Stack>

      <ConfirmDialog
        open={deleting !== null}
        title="Obrisati materijal?"
        description={
          <>
            Datoteka <strong>{deleting?.file_name ?? ''}</strong> bit će trajno obrisana i studenti
            je više neće moći preuzeti.
          </>
        }
        confirmLabel="Obriši"
        pending={deleteModuleFile.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </ContentCard>
  );
}
