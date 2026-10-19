'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import CourseForm from '@/components/courses/CourseForm';
import CourseDeleteSection from '@/components/courses/CourseDeleteSection';
import CourseOwnerSection from '@/components/courses/CourseOwnerSection';
import { useAdminCourse, useUpdateCourse } from '@/hooks/useCourses';
import { useUploadFile } from '@/hooks/useUploads';
import { isStatus } from '@/lib/api/errorMessage';
import { BUCKETS, courseThumbnailUrl } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { courseToFormValues, toUpdateCoursePayload } from '@/lib/schemas/course-form.schema';
import type { CourseFormValues } from '@/lib/schemas/course-form.schema';
import type { Course } from '@/lib/schemas/courses.schema';
import { FEATURES } from '@/lib/features';

/**
 * Edit a course.
 *
 * The counterpart to `courses/new/page.tsx`, and worth reading alongside it —
 * they share `<CourseForm>` and differ only in flow.
 *
 * ## The form must live *inside* `<QueryState
          skeleton="form">`
 *
 * `defaultValues` is read once, when the form mounts. Rendering `<CourseForm>`
 * next to the query — even guarded by `course.data &&` — risks mounting it
 * before the data lands, after which the fields stay empty no matter what
 * arrives. Passing the loaded course down through the render function is what
 * guarantees it mounts already populated.
 *
 * ## The thumbnail is one step here, not two
 *
 * The create page has to create the course *before* it can upload, because the
 * storage path is `{course_id}/{filename}` and the id doesn't exist yet — which
 * is why a failed upload there leaves a course behind and only warns.
 *
 * Editing already has the id, so the order can be reversed: upload first, then
 * save everything in a single PATCH. A failed upload means nothing was written
 * at all, so `<Form>` reports it and a retry is safe. Prefer that order whenever
 * the record already exists.
 */
export default function EditCoursePage(props: PageProps<'/admin/courses/[id]/edit'>) {
  // `params` is a Promise in this version of Next; a client component unwraps
  // it with React's `use`.
  const { id } = React.use(props.params);

  const course = useAdminCourse(id);

  if (course.isError && isStatus(course.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState
            title="Obuka nije pronađena"
            description="Ova obuka ne postoji ili nemate pristup njoj."
            action={
              <Button href="/admin/courses" variant="contained">
                Nazad na obuke
              </Button>
            }
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="form">
      <QueryState query={course} errorTitle="Obuku nije moguće učitati">
        {(data) => <EditCourseContent course={data} />}
      </QueryState>
    </PageContainer>
  );
}

/**
 * Split out so the form mounts with the course already in hand — see the note
 * above about `defaultValues`.
 */
function EditCourseContent({ course }: { course: Course }) {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const updateCourse = useUpdateCourse();
  const uploadFile = useUploadFile();

  // No try/catch: <Form> catches whatever this throws, shows it inline and
  // raises a toast. A duplicate slug arrives here as a 409 and is reported the
  // same way.
  async function handleSubmit(values: CourseFormValues) {
    const thumbnailPath = values.thumbnail
      ? (
          await uploadFile.mutateAsync({
            bucket: BUCKETS.courseThumbnails,
            folders: [course.id],
            file: values.thumbnail,
          })
        ).path
      : undefined;

    const { data: saved } = await updateCourse.mutateAsync({
      id: course.id,
      body: {
        ...toUpdateCoursePayload(values),
        // Only sent when a new file was chosen — omitting the key leaves the
        // existing image alone rather than clearing it.
        ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}),
      },
    });

    // The slug may differ from what was submitted: sending '' asks the database
    // to regenerate it from the name, so report what was actually stored.
    if (saved.slug !== course.slug) {
      toast.success(`Obuka je sačuvana. Nova adresa: /courses/${saved.slug}`);
    } else {
      toast.success(`Obuka „${saved.name}” je sačuvana.`);
    }

    router.push('/admin/courses');
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        breadcrumbs={[{ label: 'Obuke', href: '/admin/courses' }, { label: course.name }]}
        title="Izmjena obuke"
        description="Promjene su odmah vidljive na javnoj stranici obuke."
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button href={`/admin/courses/${course.id}/modules`} variant="outlined">
              Moduli
            </Button>
            {/* Published courses only — a draft's public page 404s for everyone
                except staff, so offering the link would mostly disappoint. */}
            {course.published ? (
              <Button href={`/courses/${course.slug}`} variant="outlined">
                Pregledaj
              </Button>
            ) : null}
          </Stack>
        }
      />

      <CourseForm
        defaultValues={courseToFormValues(course)}
        onSubmit={handleSubmit}
        submitLabel="Sačuvaj izmjene"
        pendingLabel="Čuvanje izmjena…"
        currentThumbnailUrl={courseThumbnailUrl(course.thumbnail_path)}
        canPublish={isAdmin}
        showSlugField
      />

      {/* Admin only: reassigning a course is not something a teacher may do to
          their own work, and the column guard would reject it anyway. */}
      {isAdmin && FEATURES.teachers ? <CourseOwnerSection course={course} /> : null}

      <CourseDeleteSection course={course} />
    </Stack>
  );
}
