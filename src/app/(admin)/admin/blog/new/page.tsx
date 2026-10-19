'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import BlogPostForm from '@/components/blog/BlogPostForm';
import { useCreateBlogPost } from '@/hooks/useBlogPosts';
import { useUploadFile } from '@/hooks/useUploads';
import { BUCKETS } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import {
  emptyBlogPostFormValues,
  toCreateBlogPostPayload,
  type BlogPostFormValues,
} from '@/lib/schemas/blog-form.schema';

/**
 * Write a new post.
 *
 * ## The id is chosen here, before anything is saved
 *
 * Images live at `blog-images/{post_id}/…`, and an admin pastes images into the
 * body long before pressing "Objavi". So the page generates the id up front and
 * sends it with the create request; the editor's uploads already have their
 * folder. That also lets the cover go first, as on the edit page — upload, then
 * one insert — rather than the course page's create-then-attach: a failed
 * upload means nothing was saved, and retrying is safe.
 *
 * The cost: images pasted into a post that is then abandoned stay in the
 * bucket under an id no row ever had. Harmless, and visible if anyone looks.
 */
export default function NewBlogPostPage() {
  const router = useRouter();
  const [postId] = React.useState(() => crypto.randomUUID());
  const createPost = useCreateBlogPost();
  const uploadFile = useUploadFile();

  // No try/catch: <Form> surfaces whatever this throws.
  async function handleSubmit(values: BlogPostFormValues) {
    const imagePath = values.image
      ? (
          await uploadFile.mutateAsync({
            bucket: BUCKETS.blogImages,
            folders: [postId],
            file: values.image,
          })
        ).path
      : null;

    const { data: post } = await createPost.mutateAsync(
      toCreateBlogPostPayload(values, postId, imagePath),
    );

    toast.success(`Članak je objavljen na /blog/${post.slug}.`);
    router.push('/admin/blog');
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Blog', href: '/admin/blog' }, { label: 'Novi članak' }]}
        title="Novi članak"
        description="Članak je javan čim ga sačuvate. Adresa se pravi iz naslova."
      />

      <BlogPostForm
        postId={postId}
        defaultValues={emptyBlogPostFormValues()}
        onSubmit={handleSubmit}
        submitLabel="Objavi članak"
        pendingLabel="Objavljivanje…"
      />
    </PageContainer>
  );
}
