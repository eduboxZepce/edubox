'use client';

import * as React from 'react';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useDeleteTask } from '@/hooks/useTasks';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { Task } from '@/lib/schemas/tasks.schema';

/**
 * Remove the task from a module.
 *
 * Stays on the page afterwards rather than navigating away — unlike deleting a
 * course or a module, the thing you were editing still exists (the module does),
 * and the screen simply reverts to offering a new task. That is the useful
 * outcome if you deleted it to start over.
 *
 * Outside `<TaskForm>` on purpose: it ignores whatever is typed in the field.
 */
export default function TaskDeleteSection({ task }: { task: Task }) {
  const [confirming, setConfirming] = React.useState(false);
  const deleteTask = useDeleteTask();

  async function handleDelete() {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success('Zadatak je obrisan.');
      setConfirming(false);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard title="Brisanje zadatka">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="body2" color="text.secondary">
          Briše zadatak, njegove priloge i sva predana rješenja studenata, zajedno sa porukama uz
          njih. Modul ostaje, samo više neće imati zadatak.
        </Typography>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => setConfirming(true)}
          sx={{ flexShrink: 0 }}
        >
          Obriši zadatak
        </Button>
      </Stack>

      <ConfirmDialog
        open={confirming}
        title="Obrisati zadatak?"
        description="Zadatak, prilozi i sva predana rješenja studenata bit će trajno obrisani. Ova akcija se ne može poništiti."
        confirmLabel="Obriši zadatak"
        pending={deleteTask.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
      />
    </ContentCard>
  );
}
