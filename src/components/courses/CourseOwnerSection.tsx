'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useAdminUsers } from '@/hooks/useUsers';
import { useUpdateCourse } from '@/hooks/useCourses';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { Course } from '@/lib/schemas/courses.schema';

/**
 * Who authors this course.
 *
 * ## Outside `<CourseForm>`, like the delete section
 *
 * It ignores every value in the form and is admin-only, so grouping it under
 * the same "Sačuvaj" would imply it is part of that save when it is a separate
 * decision with a separate audience. Same reasoning that put
 * `<CourseDeleteSection>` beside the form rather than in it.
 *
 * ## Why an admin needs this at all
 *
 * A teacher owns what they create, and nothing else could ever move it. That
 * is fine until a teacher is deactivated, leaves, or a course simply needs to
 * change hands — at which point the material is stranded with an owner who
 * cannot or should not edit it. `owner_id` is also `ON DELETE SET NULL`, so a
 * deleted teacher leaves the course ownerless and *no* teacher can author it.
 * That case is called out below rather than hidden.
 *
 * The database is the real guard: `guard_course_privileged_columns()` raises
 * 42501 if anyone but an admin changes this column, so a teacher who reached
 * this component somehow still could not use it.
 */
export default function CourseOwnerSection({ course }: { course: Course }) {
  const [ownerId, setOwnerId] = React.useState(course.owner_id ?? '');
  const [confirming, setConfirming] = React.useState(false);

  // Deactivated teachers are deliberately still listed: an admin may well be
  // moving a course *away* from one, and hiding them would make the current
  // owner vanish from the control that is supposed to explain the situation.
  const teachers = useAdminUsers({ role: 'teacher', pageSize: 100 });

  const update = useUpdateCourse();
  const changed = (course.owner_id ?? '') !== ownerId;

  const options = teachers.data?.data ?? [];
  const selected = options.find((t) => t.id === ownerId);

  async function save() {
    try {
      await update.mutateAsync({
        id: course.id,
        // An empty select means "nobody", which the column allows.
        body: { owner_id: ownerId === '' ? null : ownerId },
      });
      toast.success(
        ownerId === ''
          ? 'Obuka više nema predavača.'
          : `Obuka je dodijeljena: ${selected?.full_name}.`,
      );
      setConfirming(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard
      title="Predavač"
      description="Predavač može uređivati ovu obuku i pregledati predana rješenja na njoj."
    >
      <Stack spacing={2}>
        {!course.owner_id ? (
          <Alert severity="warning">
            Ova obuka trenutno nema predavača — nijedan predavač je ne može uređivati. Dodijelite je
            nekome ili je uređujte kao administrator.
          </Alert>
        ) : null}

        {selected?.deactivated_at ? (
          <Alert severity="warning">
            Trenutni predavač je deaktiviran i ne može pristupiti obuci. Dodijelite obuku drugom
            predavaču.
          </Alert>
        ) : null}

        <TextField
          select
          label="Predavač"
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          disabled={teachers.isPending || update.isPending}
          helperText={
            teachers.isPending ? 'Učitavanje predavača…' : 'Promjena važi odmah nakon potvrde.'
          }
          /*
           * "Bez predavača" is `''`, and MUI treats `''` as no value: it gates
           * both the shrunk label and the rendering of the selected item on
           * `isFilled({ value })`. Without these two the control went blank the
           * moment an admin chose it — on the one screen whose entire purpose is
           * to show who owns a course. Same fix as `<FilterSelect>`.
           */
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
        >
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">
              Bez predavača
            </Typography>
          </MenuItem>
          {options.map((teacher) => (
            <MenuItem key={teacher.id} value={teacher.id}>
              {teacher.full_name}
              {teacher.deactivated_at ? ' — deaktiviran' : ''}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row">
          <Button
            variant="contained"
            disabled={!changed || update.isPending}
            onClick={() => setConfirming(true)}
          >
            {update.isPending ? 'Čuvanje…' : 'Dodijeli obuku'}
          </Button>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirming}
        title="Promijeniti predavača obuke?"
        description={
          ownerId === ''
            ? 'Obuka će ostati bez predavača. Nijedan predavač je neće moći uređivati niti pregledati predana rješenja na njoj, dok joj ne dodijelite novog.'
            : `Obuka se dodjeljuje predavaču ${selected?.full_name ?? ''}. Dobiva pravo uređivati sve module, kvizove i zadatke na njoj i pregledati predana rješenja. Prethodni predavač gubi taj pristup.`
        }
        confirmLabel="Dodijeli"
        severity="primary"
        pending={update.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void save()}
      />
    </ContentCard>
  );
}
