'use client';

import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormSelect from '@/components/form/FormSelect';
import FormTextField from '@/components/form/FormTextField';
import { useZodForm } from '@/lib/forms/useZodForm';
import { useUpdateUser } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import {
  USER_ROLE_OPTIONS,
  toUpdateUserPayload,
  userFormSchema,
  userToFormValues,
  type UserFormValues,
} from '@/lib/schemas/user-form.schema';
import type { Profile } from '@/lib/schemas/users.schema';
import { FEATURES } from '@/lib/features';

/**
 * Edit one user's name and role.
 *
 * Mounted only while open (see `CategoryFormDialog` for why): `defaultValues` is
 * read once at mount, so a dialog left mounted would show the previous user's
 * details.
 *
 * ## Editing yourself
 *
 * The API refuses to let an admin drop their own admin role — nothing in the UI
 * could restore it afterwards. Rather than let the request fail, the role field
 * is disabled when you are looking at your own account, with a note saying why.
 * Renaming yourself is still allowed.
 *
 * That is a convenience, not the protection: the guard in the route is.
 */
export default function UserFormDialog({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const currentUserId = useAuthStore((s) => s.profile?.id);
  const isSelf = currentUserId === profile.id;

  const form = useZodForm(userFormSchema, { defaultValues: userToFormValues(profile) });

  /*
   * With teachers switched off the role is not offered. An account that is
   * already a teacher keeps the option, or the select would hold a value it has
   * no label for and the save would quietly look like a change.
   */
  const roleOptions = USER_ROLE_OPTIONS.filter(
    (option) => option.value !== 'teacher' || FEATURES.teachers || profile.role === 'teacher',
  );
  const updateUser = useUpdateUser();

  // No try/catch: <Form> catches whatever this throws and surfaces it inline.
  async function handleSubmit(values: UserFormValues) {
    await updateUser.mutateAsync({ id: profile.id, body: toUpdateUserPayload(values) });
    toast.success(`Nalog „${values.full_name}” je sačuvan.`);
    onClose();
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open onClose={isSubmitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Izmijeni korisnika</DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Form form={form} onSubmit={handleSubmit}>
          {isSelf ? (
            <Alert severity="info">
              Ovo je vaš nalog. Svoju ulogu ne možete promijeniti — ako biste sebi oduzeli
              administratorska prava, niko ih kroz aplikaciju ne bi mogao vratiti.
            </Alert>
          ) : null}

          <FormTextField name="full_name" label="Ime i prezime" required />

          <FormSelect
            name="role"
            label="Uloga"
            options={roleOptions}
            required
            disabled={isSelf}
            helperText={
              isSelf
                ? undefined
                : FEATURES.teachers
                  ? 'Predavač može uređivati samo obuke koje sam kreira ili koje posjeduje.'
                  : undefined
            }
          />

          <FormActions submitLabel="Sačuvaj" onCancel={onClose} />
        </Form>
      </DialogContent>
    </Dialog>
  );
}
