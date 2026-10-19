'use client';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import ContentCard from '@/components/layout/ContentCard';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormNumberField from '@/components/form/FormNumberField';
import FormTextField from '@/components/form/FormTextField';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  moduleFormSchema,
  type ModuleFormInput,
  type ModuleFormValues,
} from '@/lib/schemas/module-form.schema';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE FORM — the fields of one module.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The fields below follow `CourseForm` exactly.
 *
 * Materials are deliberately NOT here. A file is uploaded the moment it is
 * chosen, not when the form is submitted, so mixing it into this form would
 * mean one Save button that commits some changes instantly and others on
 * click. `<ModuleMaterials>` sits beside the form on the edit page instead —
 * and only there, since a file needs the module id for its storage path.
 *
 * ## The shape to copy
 *
 * This is the same contract `CourseForm` uses, and the reason it works:
 *   - the *component* owns the fields, their layout and their validation;
 *   - the *page* owns `onSubmit`, because creating and editing are different
 *     flows.
 * That split is what lets one component serve both pages without a
 * `mode="create" | "edit"` prop threading conditionals through the markup.
 *
 * ## The one rule that will bite you
 *
 * `defaultValues` is read **once, at mount**. The edit page must therefore
 * render this component *inside* its `<QueryState>`, never beside it — if it
 * mounts before the module has loaded, the fields start empty and stay empty
 * no matter what arrives later.
 *
 * ## Why there is no `course_id` field
 *
 * A module always belongs to the course in the URL. The page passes the id to
 * `toCreateModulePayload(values, courseId)` instead of hiding it in a form
 * field, so the relationship stays visible in the code.
 */
export default function ModuleForm({
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
  pendingLabel,
}: {
  defaultValues: Partial<ModuleFormInput>;
  onSubmit: (values: ModuleFormValues) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
  pendingLabel?: string;
}) {
  const form = useZodForm(moduleFormSchema, { defaultValues });

  return (
    <Form form={form} onSubmit={onSubmit} pendingLabel={pendingLabel}>
      <ContentCard
        title="Osnovni podaci"
        description="Naslov i opis modula koje student vidi u listi obuke."
      >
        <Stack spacing={2}>
          <FormTextField
            name="title"
            label="Naslov modula"
            placeholder="npr. HTML i CSS osnove"
            required
          />
          <FormTextField
            name="description"
            label="Opis"
            placeholder="Što student uči u ovom modulu."
            multiline
            rows={4}
          />
        </Stack>
      </ContentCard>

      <ContentCard title="Sadržaj">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <FormTextField
              name="video_url"
              label="YouTube video"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              helperText="Neobavezno. Link na YouTube video; ostavite prazno ako modul nema video."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormNumberField
              name="order"
              label="Redni broj"
              min={0}
              step={1}
              helperText="Određuje redoslijed otključavanja."
              required
            />
          </Grid>
        </Grid>
      </ContentCard>

      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} />
    </Form>
  );
}
