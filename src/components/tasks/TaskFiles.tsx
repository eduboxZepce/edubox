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
import { useCreateTaskFile, useDeleteTaskFile } from '@/hooks/useTasks';
import { useUploadFile } from '@/hooks/useUploads';
import { taskFileSchema } from '@/lib/forms/fileSchema';
import { errorMessage } from '@/lib/api/errorMessage';
import { BUCKETS, MAX_UPLOAD_BYTES, formatBytes } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import type { TaskFile } from '@/lib/schemas/tasks.schema';

/**
 * Files attached to a task brief — templates, datasets, starter projects.
 *
 * ## Why this is a near-twin of `<ModuleMaterials>` and not shared with it
 *
 * The two look alike today but answer to different rules, and the rules are the
 * point:
 *
 *   - a **module material** is protected course content — PDF only, and the
 *     student reads it inside the app without ever being handed the file;
 *   - a **task file** is a working document — any of several formats, and the
 *     student is *meant* to download it and work on it.
 *
 * Folding them into one parameterised component would put those two policies
 * behind the same props and invite a future change to quietly apply to both.
 * The duplication is deliberate; if it ever becomes painful, extract the row
 * markup, not the policy.
 *
 * Like materials, this is not part of `<TaskForm>`: a file is stored the moment
 * it is chosen and removed the moment you confirm, neither of which waits for
 * "Sačuvaj". It also cannot exist before the task does — the row needs a
 * `task_id` — so the page shows it only once the task has been created.
 *
 * The storage path is `{course_id}/{module_id}/{filename}`. **That order is
 * load-bearing:** the policy reads the first segment and checks
 * `can_author_course()` against it, so a reversed path uploads without error and
 * is then unreadable by everyone, permanently.
 */
export default function TaskFiles({
  courseId,
  moduleId,
  taskId,
  files,
}: {
  courseId: string;
  moduleId: string;
  taskId: string;
  files: TaskFile[];
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = React.useState<TaskFile | null>(null);

  const uploadFile = useUploadFile();
  const createTaskFile = useCreateTaskFile();
  const deleteTaskFile = useDeleteTaskFile();

  const isUploading = uploadFile.isPending || createTaskFile.isPending;

  async function handleFiles(picked: FileList | null) {
    if (!picked?.length) return;

    // Sequential, not `Promise.all`: the endpoint takes one file per request,
    // and a serial loop keeps each error tied to the file that caused it.
    for (const file of Array.from(picked)) {
      const parsed = taskFileSchema.safeParse(file);
      if (!parsed.success) {
        toast.error(
          `${file.name}: ${parsed.error.issues[0]?.message ?? 'Datoteka nije prihvaćena.'}`,
        );
        continue;
      }

      try {
        const { path } = await uploadFile.mutateAsync({
          bucket: BUCKETS.taskFiles,
          // Course first — see the note above.
          folders: [courseId, moduleId],
          file,
        });

        await createTaskFile.mutateAsync({
          taskId,
          body: { file_path: path, file_name: file.name },
        });

        toast.success(`Prilog "${file.name}" je dodan.`);
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
      await deleteTaskFile.mutateAsync(deleting.id);
      toast.success('Prilog je obrisan.');
      setDeleting(null);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard
      title="Prilozi uz zadatak"
      description="Predlošci i datoteke koje student preuzima da bi uradio zadatak."
      disablePadding
    >
      {isUploading ? <LinearProgress /> : null}

      {files.length === 0 ? (
        <Stack sx={{ px: 3, py: 4, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Zadatak nema priloge.
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
                {file.file_name ?? file.file_path.split('/').pop()}
              </Typography>

              <Tooltip title="Obriši">
                <IconButton
                  size="small"
                  onClick={() => setDeleting(file)}
                  aria-label={`Obriši prilog ${file.file_name ?? ''}`}
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
          {isUploading ? 'Učitavanje…' : 'Dodaj prilog'}
        </Button>

        <Typography variant="caption" color="text.secondary">
          PDF, ZIP, TXT, CSV ili slika. Najviše {formatBytes(MAX_UPLOAD_BYTES)} po datoteci.
        </Typography>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </Stack>

      <ConfirmDialog
        open={deleting !== null}
        title="Obrisati prilog?"
        description={
          <>
            Datoteka <strong>{deleting?.file_name ?? ''}</strong> bit će trajno obrisana i studenti
            je više neće moći preuzeti.
          </>
        }
        confirmLabel="Obriši"
        pending={deleteTaskFile.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </ContentCard>
  );
}
