'use client';

import * as React from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useDeleteModule } from '@/hooks/useModules';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { ModuleWithFiles } from '@/lib/schemas/modules.schema';

/**
 * What you can do to one module from the list: edit it, move it, delete it.
 *
 * Owns the delete mutation and its confirmation, like `CourseActions` — the
 * list renders modules, this decides what can be done to one. Reordering is
 * *not* owned here: swapping two modules is a fact about the pair, not about
 * either one, so the list performs it and this component only reports the
 * intent upward through `onMove`.
 *
 * Plain icon buttons rather than a ⋮ menu, because the row has four actions
 * that all benefit from being one click away — and because `<MenuItem href>`
 * silently does not navigate (see the note in `theme.ts`). A bare `href` on
 * `IconButton` is enough: the theme wires Next's Link in globally, and unlike
 * MenuItem its root stays the default `button`, so the swap actually happens.
 */
export default function ModuleActions({
  currentModule,
  courseId,
  canMoveUp,
  canMoveDown,
  onMove,
  isMoving = false,
}: {
  /** Not `module` — that identifier is rejected by @next/next/no-assign-module-variable. */
  currentModule: ModuleWithFiles;
  courseId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
  isMoving?: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const deleteModule = useDeleteModule();

  async function handleDelete() {
    try {
      await deleteModule.mutateAsync(currentModule.id);
      toast.success(`Modul "${currentModule.title}" je obrisan.`);
      setConfirming(false);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Tooltip title="Pomjeri gore">
          {/* A disabled IconButton renders no events, so the tooltip needs a
              wrapper element to remain hoverable at the ends of the list. */}
          <span>
            <IconButton
              size="small"
              disabled={!canMoveUp || isMoving}
              onClick={() => onMove('up')}
              aria-label={`Pomjeri modul ${currentModule.title} gore`}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Pomjeri dolje">
          <span>
            <IconButton
              size="small"
              disabled={!canMoveDown || isMoving}
              onClick={() => onMove('down')}
              aria-label={`Pomjeri modul ${currentModule.title} dolje`}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Izmijeni">
          <IconButton
            size="small"
            href={`/admin/courses/${courseId}/modules/${currentModule.id}/edit`}
            aria-label={`Izmijeni modul ${currentModule.title}`}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Obriši">
          <IconButton
            size="small"
            onClick={() => setConfirming(true)}
            aria-label={`Obriši modul ${currentModule.title}`}
          >
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      </Stack>

      <ConfirmDialog
        open={confirming}
        title="Obrisati modul?"
        description={
          <>
            Modul <strong>{currentModule.title}</strong> bit će trajno obrisan, zajedno sa svojim
            kvizom, zadatkom i materijalima. Napredak studenata na ovom modulu se također briše. Ova
            akcija se ne može poništiti.
          </>
        }
        confirmLabel="Obriši modul"
        pending={deleteModule.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
