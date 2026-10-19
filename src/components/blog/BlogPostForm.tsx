'use client';

import * as React from 'react';
import { useController, useWatch } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ContentCard from '@/components/layout/ContentCard';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormImageUpload from '@/components/form/FormImageUpload';
import FormSwitch from '@/components/form/FormSwitch';
import FormTextField from '@/components/form/FormTextField';
import MarkdownEditor from '@/components/markdown/MarkdownEditor';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { blogCategories } from '@/lib/blog';
import { useZodForm } from '@/lib/forms/useZodForm';
import { BUCKETS } from '@/lib/storage';
import {
  blogPostFormSchema,
  type BlogPostFormInput,
  type BlogPostFormValues,
} from '@/lib/schemas/blog-form.schema';

/**
 * The blog post form — shared by the create and edit pages, which own what
 * happens on save (see `CourseForm` for why the split runs that way).
 *
 * `postId` is known on both pages: the create page generates it up front so
 * images pasted into the body have their `blog-images/{post_id}/` folder before
 * the post exists.
 *
 * `defaultValues` is read once at mount, so the edit page renders this inside
 * its `<QueryState>`.
 */
export default function BlogPostForm({
  postId,
  defaultValues,
  onSubmit,
  submitLabel,
  pendingLabel,
  currentImageUrl,
  showSlugField = false,
}: {
  postId: string;
  defaultValues: BlogPostFormInput;
  onSubmit: (values: BlogPostFormValues) => Promise<void>;
  submitLabel: string;
  pendingLabel?: string;
  /** The saved cover, previewed on the edit page. */
  currentImageUrl?: string | null;
  /** Edit only — on create the database derives the slug from the title. */
  showSlugField?: boolean;
}) {
  const form = useZodForm(blogPostFormSchema, { defaultValues });
  const [image, removeImage, hasCurrentImage] = useWatch({
    control: form.control,
    name: ['image', 'remove_image', 'has_current_image'],
  });

  // A cover that will exist after saving — the alt text is only relevant then.
  const willHaveImage = Boolean(image) || (hasCurrentImage && !removeImage);

  return (
    <Form form={form} onSubmit={onSubmit} pendingLabel={pendingLabel}>
      <ContentCard title="Osnovni podaci">
        <Stack spacing={2}>
          <FormTextField name="title" label="Naslov" required />
          <FormTextField
            name="excerpt"
            label="Sažetak"
            helperText="Jedna do dvije rečenice, oko 120–160 znakova. Prikazuje se na kartici članka i kao opis u rezultatima pretrage."
            multiline
            rows={3}
            required
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <CategoryField />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormTextField
                name="published_at"
                label="Datum objave"
                type="date"
                helperText="Članci su poredani po ovom datumu, najnoviji prvi."
                required
              />
            </Grid>
          </Grid>
        </Stack>
      </ContentCard>

      {showSlugField ? (
        <ContentCard title="Adresa stranice" description="Dio URL-a: /blog/{adresa}.">
          <Stack spacing={2}>
            <FormTextField
              name="slug"
              label="Adresa (slug)"
              helperText="Ostavite prazno da se adresa ponovo generira iz naslova."
            />
            <Alert severity="warning">
              Promjena adrese mijenja javni link ka članku. Stari link prestaje raditi, a članak
              gubi pozicije koje je stekao u pretraživačima. Promjena naslova sama po sebi ne
              mijenja adresu.
            </Alert>
          </Stack>
        </ContentCard>
      ) : null}

      <ContentCard
        title="Naslovna slika"
        description="Prikazuje se na vrhu članka, na kartici u listi i pri dijeljenju linka."
      >
        <Stack spacing={2}>
          <FormImageUpload
            name="image"
            label="Slika"
            currentImageUrl={removeImage ? null : currentImageUrl}
          />
          {hasCurrentImage && !image ? (
            <FormSwitch
              name="remove_image"
              label="Ukloni naslovnu sliku"
              description="Članak se prikazuje bez slike."
            />
          ) : null}
          {willHaveImage ? (
            <FormTextField
              name="image_alt"
              label="Opis slike"
              helperText="Što je na slici — čitaju ga čitači ekrana i pretraživači."
              required
            />
          ) : null}
        </Stack>
      </ContentCard>

      <ContentCard title="Tekst članka">
        <ContentField postId={postId} />
      </ContentCard>

      <FormActions submitLabel={submitLabel} cancelHref="/admin/blog" />
    </Form>
  );
}

/**
 * The topic, as free text with the existing topics offered.
 *
 * Free text rather than a managed list because a topic is just a label on the
 * filter pills — but suggesting what is already in use is what keeps "Biznis"
 * and "Poslovanje" from both appearing for the same thing.
 */
function CategoryField() {
  const { field, fieldState } = useController<BlogPostFormInput, 'category'>({
    name: 'category',
  });
  // Posts number in the dozens; one page of summaries covers every topic.
  const posts = useBlogPosts({ pageSize: 100 });
  const options = React.useMemo(
    () => blogCategories(posts.data?.data ?? []).sort((a, b) => a.localeCompare(b, 'bs')),
    [posts.data],
  );

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={field.value ?? ''}
      // `inputValue` is what the admin is typing; with `freeSolo` that *is* the
      // value, so it is written straight through rather than waiting for a pick.
      inputValue={field.value ?? ''}
      onInputChange={(_event, value) => field.onChange(value)}
      onChange={(_event, value) => field.onChange(value ?? '')}
      disabled={field.disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Tema"
          error={Boolean(fieldState.error)}
          helperText={
            fieldState.error?.message ?? 'Koristi se za filter na stranici bloga. Nije obavezna.'
          }
          slotProps={{ ...params.slotProps, formHelperText: { sx: { minHeight: 20, mx: 0 } } }}
        />
      )}
    />
  );
}

/** The Markdown body. Pasted or dropped images go to the post's own folder. */
function ContentField({ postId }: { postId: string }) {
  const { field, formState } = useController<BlogPostFormInput, 'content'>({ name: 'content' });
  const imageTarget = React.useMemo(
    () => ({ bucket: BUCKETS.blogImages, folders: [postId] }),
    [postId],
  );

  return (
    <MarkdownEditor
      value={field.value ?? ''}
      onChange={field.onChange}
      disabled={formState.isSubmitting}
      height={560}
      allowImages
      imageTarget={imageTarget}
      helperText="Koristite alatnu traku iznad za podnaslove, podebljano, liste i linkove. Sliku možete zalijepiti ili prevući u tekst."
    />
  );
}
