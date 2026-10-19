'use client';

import * as React from 'react';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import UserFormDialog from './UserFormDialog';
import { useUpdateUser } from '@/hooks/useUsers';
import { errorMessage } from '@/lib/api/errorMessage';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import type { Profile } from '@/lib/schemas/users.schema';

/**
 * What an admin can do to one account: edit it, and switch it on or off.
 *
 * Owns its mutation and both dialogs, like `CourseActions` — the page renders a
 * user, this decides what can be done to one.
 *
 * ## Deactivation is not deletion
 *
 * Deactivating bans the account in Supabase Auth so it cannot sign in. Nothing
 * is removed: purchases, certificates, submissions and any courses a teacher
 * owns all stay exactly as they were, and reactivating restores access. That
 * distinction is why the confirmation is worded the way it is — an admin
 * expecting "delete" would be misled by a vaguer prompt.
 *
 * It is also reversible, so unlike a real deletion this uses `primary`, not
 * `error`, severity.
 */
export default function UserAccountActions({ profile }: { profile: Profile }) {
  const [editing, setEditing] = React.useState(false);
  const [confirmingToggle, setConfirmingToggle] = React.useState(false);
  const updateUser = useUpdateUser();

  const currentUserId = useAuthStore((s) => s.profile?.id);
  const isSelf = currentUserId === profile.id;
  const isDeactivated = profile.deactivated_at !== null;

  async function handleToggle() {
    try {
      await updateUser.mutateAsync({
        id: profile.id,
        body: { deactivated: !isDeactivated },
      });
      toast.success(
        isDeactivated
          ? `Nalog „${profile.full_name}” je ponovo aktiviran.`
          : `Nalog „${profile.full_name}” je deaktiviran.`,
      );
      setConfirmingToggle(false);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<EditOutlinedIcon />}
          onClick={() => setEditing(true)}
        >
          Izmijeni
        </Button>

        {/* An admin cannot disable their own account — the API refuses it, and
            offering a button that always fails would be worse than hiding it. */}
        {isSelf ? null : (
          <Button
            variant="outlined"
            color={isDeactivated ? 'success' : 'error'}
            startIcon={isDeactivated ? <CheckCircleOutlinedIcon /> : <BlockOutlinedIcon />}
            onClick={() => setConfirmingToggle(true)}
          >
            {isDeactivated ? 'Aktiviraj' : 'Deaktiviraj'}
          </Button>
        )}
      </Stack>

      {editing ? <UserFormDialog profile={profile} onClose={() => setEditing(false)} /> : null}

      <ConfirmDialog
        open={confirmingToggle}
        title={isDeactivated ? 'Aktivirati nalog?' : 'Deaktivirati nalog?'}
        description={
          isDeactivated ? (
            <>
              <strong>{profile.full_name}</strong> će se ponovo moći prijaviti i nastavit će tamo
              gdje je stao/la.
            </>
          ) : (
            <>
              <strong>{profile.full_name}</strong> se više neće moći prijaviti. Ništa se ne briše —
              kupovine, certifikati i obuke ostaju sačuvani, a nalog možete ponovo aktivirati u bilo
              kom trenutku.
            </>
          )
        }
        confirmLabel={isDeactivated ? 'Aktiviraj nalog' : 'Deaktiviraj nalog'}
        severity={isDeactivated ? 'primary' : 'error'}
        pending={updateUser.isPending}
        onCancel={() => setConfirmingToggle(false)}
        onConfirm={() => void handleToggle()}
      />
    </>
  );
}
