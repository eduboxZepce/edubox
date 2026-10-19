'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import BlogPostForm from '@/components/blog/BlogPostForm';
import { BlogPostDeleteDialog } from '@/components/blog/BlogPostActions';
import { useBlogPost, useDeleteBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts';
import { useUploadFile } from '@/hooks/useUploads';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { blogImageUrl } from '@/lib/blog';
import { BUCKETS } from '@/lib/storage';
import { toast } from '@/store/useToastStore';
import {
  blogPostToFormValues,
  toUpdateBlogPostPayload,
  type BlogPostFormValues,
} from '@/lib/schemas/blog-form.schema';
import type { BlogPostRecord } from '@/lib/schemas/blog.schema';

/**
 * Edit a post. The form renders inside `<QueryState>` so it mounts with the
 * post already loaded — `defaultValues` is read only once.
 */
export default function EditBlogPostPage(props: PageProps<'/admin/blog/[id]'>) {
  const { id } = React.use(props.params);
  const post = useBlogPost(id);

  if (post.isError && isStatus(post.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState
            title="Članak nije pronađen"
            description="Ovaj članak ne postoji ili je obrisan."
            action={
              <Button href="/admin/blog" variant="contained">
                Nazad na blog
              </Button>
            }
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState skeleton="form" query={post} errorTitle="Članak nije moguće učitati">
        {(data) => <EditBlogPostContent post={data} />}
      </QueryState>
    </PageContainer>
  );
}

function EditBlogPostContent({ post }: { post: BlogPostRecord }) {
  const router = useRouter();
  const updatePost = useUpdateBlogPost();
  const uploadFile = useUploadFile();

  // Upload first, then one PATCH: a failed upload saves nothing, so a retry is
  // safe. The old cover stays in the post's folder until the post is deleted.
  async function handleSubmit(values: BlogPostFormValues) {
    const imagePath = values.image
      ? (
          await uploadFile.mutateAsync({
            bucket: BUCKETS.blogImages,
            folders: [post.id],
            file: values.image,
          })
        ).path
      : null;

    const { data: saved } = await updatePost.mutateAsync({
      id: post.id,
      body: toUpdateBlogPostPayload(values, imagePath),
    });

    // The slug may differ from what was submitted: '' asks the database to
    // regenerate it, so report what was actually stored.
    toast.success(
      saved.slug !== post.slug
        ? `Članak je sačuvan. Nova adresa: /blog/${saved.slug}`
        : 'Članak je sačuvan.',
    );
    router.push('/admin/blog');
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        breadcrumbs={[{ label: 'Blog', href: '/admin/blog' }, { label: post.title }]}
        title="Izmjena članka"
        description="Promjene su vidljive na javnoj stranici čim ih sačuvate."
        actions={
          <Button href={`/blog/${post.slug}`} variant="outlined" target="_blank" rel="noopener">
            Otvori članak
          </Button>
        }
      />

      <BlogPostForm
        postId={post.id}
        defaultValues={blogPostToFormValues(post)}
        onSubmit={handleSubmit}
        submitLabel="Sačuvaj izmjene"
        pendingLabel="Čuvanje izmjena…"
        currentImageUrl={blogImageUrl(post.image_path)}
        showSlugField
      />

      <BlogPostDeleteSection post={post} />
    </Stack>
  );
}

/**
 * Outside the form, like `CourseDeleteSection`: it ignores the fields, and it
 * must navigate away rather than leave the page on a 404.
 */
function BlogPostDeleteSection({ post }: { post: BlogPostRecord }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const deletePost = useDeleteBlogPost();

  async function handleDelete() {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success(`Članak „${post.title}” je obrisan.`);
      router.push('/admin/blog');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard title="Brisanje članka">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="body2" color="text.secondary">
          Briše članak i slike učitane uz njega. Njegova adresa nakon toga vraća „stranica nije
          pronađena”.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => setConfirming(true)}
          sx={{ flexShrink: 0 }}
        >
          Obriši članak
        </Button>
      </Stack>

      <BlogPostDeleteDialog
        post={post}
        open={confirming}
        pending={deletePost.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
      />
    </ContentCard>
  );
}
