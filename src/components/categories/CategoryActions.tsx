'use client';

import * as React from 'react';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import CategoryFormDialog from './CategoryFormDialog';
import { useDeleteCategory } from '@/hooks/useCategories';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatCourseCount } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { CategoryWithCount } from '@/lib/schemas/categories.schema';

/**
 * Row actions for one category: edit and delete.
 *
 * Like `CourseActions`, it owns its mutations and dialogs rather than taking
 * them as props — the list renders records, this decides what you can *do* to
 * one. Two plain icon buttons instead of a ⋮ menu, because two actions don't
 * justify the extra click.
 *
 * ## What deleting a category actually does
 *
 * `courses.category_id` is `ON DELETE SET NULL` (migration 0005), so deleting a
 * category **never fails** — it silently uncategorises every course that used
 * it, and nothing records what those courses used to be in. That's not
 * recoverable, so the confirmation names the number of affected courses instead
 * of asking a generic "are you sure?".
 *
 * It warns rather than blocks deliberately: there is currently no UI to change
 * a course's category (`/admin/courses/[id]/edit` is still a placeholder), so a
 * hard block would be a dead end with no way to clear it. Revisit once the
 * course edit page exists.
 */
export default function CategoryActions({ category }: { category: CategoryWithCount }) {
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const deleteCategory = useDeleteCategory();

  const inUse = category.course_count > 0;

  async function handleDelete() {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success(`Kategorija „${category.name}” je obrisana.`);
      setConfirmingDelete(false);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title="Izmijeni">
          <IconButton
            size="small"
            onClick={() => setEditing(true)}
            aria-label={`Izmijeni kategoriju ${category.name}`}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Obriši">
          <IconButton
            size="small"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Obriši kategoriju ${category.name}`}
          >
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Mounted only while open so the form picks up this category's name — see
          the note in CategoryFormDialog. */}
      {editing ? (
        <CategoryFormDialog category={category} onClose={() => setEditing(false)} />
      ) : null}

      <ConfirmDialog
        open={confirmingDelete}
        title="Obrisati kategoriju?"
        description={
          inUse ? (
            <>
              Kategoriju <strong>{category.name}</strong> koristi{' '}
              <strong>{formatCourseCount(category.course_count)}</strong>.{' '}
              {category.course_count === 1
                ? 'Ta obuka neće biti obrisana, ali će ostati bez kategorije.'
                : 'Te obuke neće biti obrisane, ali će ostati bez kategorije.'}{' '}
              Ova akcija se ne može poništiti.
            </>
          ) : (
            <>
              Kategorija <strong>{category.name}</strong> će biti trajno obrisana. Ova akcija se ne
              može poništiti.
            </>
          )
        }
        confirmLabel="Obriši kategoriju"
        pending={deleteCategory.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
