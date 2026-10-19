'use client';

import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import CourseForm from '@/components/courses/CourseForm';
import { useCreateCourse, useUpdateCourse } from '@/hooks/useCourses';
import { useUploadFile } from '@/hooks/useUploads';
import { BUCKETS } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  emptyCourseFormValues,
  toCreateCoursePayload,
  type CourseFormValues,
} from '@/lib/schemas/course-form.schema';

/**
 * Create a course.
 *
 * The page owns the *flow*; `<CourseForm>` owns the fields. Everything the
 * form kit does for you — validation, the submit overlay, disabling the button,
 * turning a thrown error into an inline alert plus a toast — is already handled
 * by `<Form>`, which is why the handler below is just the sequence of calls.
 *
 * ## The two-step thumbnail, and why
 *
 * A thumbnail's storage path is `{course_id}/{filename}` — the id has to exist
 * before the file has anywhere to go. So: create the course, upload the file,
 * then save the returned path. Any form that attaches a file to a brand-new
 * record follows this shape.
 *
 * ## Partial failure
 *
 * If the upload fails, the course still exists. Rethrowing would show "saving
 * failed" and invite a retry that creates a second course. Instead the page
 * reports what actually happened and moves on — the image can be added later
 * from the edit screen. Worth thinking about for any multi-step submit: which
 * failures mean "nothing happened", and which mean "most of it happened"?
 */
export default function NewCoursePage() {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const uploadFile = useUploadFile();

  async function handleSubmit(values: CourseFormValues) {
    // No try/catch: <Form> catches whatever this throws and surfaces it. A
    // failure here means no course was created, so retrying is safe.
    const { data: course } = await createCourse.mutateAsync(toCreateCoursePayload(values));

    if (values.thumbnail) {
      try {
        const { path } = await uploadFile.mutateAsync({
          bucket: BUCKETS.courseThumbnails,
          folders: [course.id],
          file: values.thumbnail,
        });

        await updateCourse.mutateAsync({ id: course.id, body: { thumbnail_path: path } });
      } catch {
        toast.warning(
          'Obuka je kreirana, ali sliku nije bilo moguće učitati. Dodajte je kroz izmjenu obuke.',
        );
      }
    }

    toast.success(`Obuka „${course.name}” je kreirana.`);

    // Back to the list, where the new course is already visible — the mutation
    // invalidated that cache. Once the module editor exists, sending the admin
    // straight to /admin/courses/{id}/modules is the better next step.
    router.push('/admin/courses');
  }

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[{ label: 'Obuke', href: '/admin/courses' }, { label: 'Nova obuka' }]}
        title="Nova obuka"
        description="Obuka se kreira kao nacrt dok je ne objavite. Module dodajete nakon kreiranja."
      />

      <CourseForm
        defaultValues={emptyCourseFormValues}
        onSubmit={handleSubmit}
        submitLabel="Kreiraj obuku"
        pendingLabel="Kreiranje obuke…"
        canPublish={isAdmin}
      />
    </PageContainer>
  );
}
