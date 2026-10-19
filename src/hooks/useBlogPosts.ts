'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  toSearchParams,
  type Envelope,
  type Paginated,
} from '@/lib/api/client';
import type {
  BlogPostRecord,
  BlogPostSummary,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
} from '@/lib/schemas/blog.schema';
import type { PaginationQuery } from '@/lib/schemas/common.schema';

/**
 * Blog posts, for the admin screens. The public pages read on the server and
 * never touch these — see `src/lib/server/blog.ts`.
 */

export type BlogPostListParams = Partial<PaginationQuery>;

export const blogPostKeys = {
  all: ['blog-posts'] as const,
  lists: () => [...blogPostKeys.all, 'list'] as const,
  list: (params: BlogPostListParams) => [...blogPostKeys.lists(), params] as const,
  detail: (id: string) => [...blogPostKeys.all, 'detail', id] as const,
};

/** GET /api/admin/blog-posts — newest first, without `content`. */
export function useBlogPosts(params: BlogPostListParams = {}) {
  return useQuery({
    queryKey: blogPostKeys.list(params),
    queryFn: () =>
      apiGet<Paginated<BlogPostSummary>>(`/api/admin/blog-posts${toSearchParams(params)}`),
  });
}

/** GET /api/admin/blog-posts/:id */
export function useBlogPost(id: string) {
  return useQuery({
    queryKey: blogPostKeys.detail(id),
    queryFn: () => apiGet<Envelope<BlogPostRecord>>(`/api/admin/blog-posts/${id}`),
    select: (response) => response.data,
  });
}

/**
 * Every write drops the whole namespace: a new date reorders the list, and a
 * rename changes what the category suggestions offer.
 */
function useInvalidateBlogPosts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: blogPostKeys.all });
}

/** POST /api/admin/blog-posts */
export function useCreateBlogPost() {
  const invalidate = useInvalidateBlogPosts();

  return useMutation({
    mutationFn: (body: CreateBlogPostRequest) =>
      apiPost<Envelope<BlogPostRecord>>('/api/admin/blog-posts', body),
    onSuccess: invalidate,
  });
}

/** PATCH /api/admin/blog-posts/:id */
export function useUpdateBlogPost() {
  const invalidate = useInvalidateBlogPosts();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBlogPostRequest }) =>
      apiPatch<Envelope<BlogPostRecord>>(`/api/admin/blog-posts/${id}`, body),
    onSuccess: invalidate,
  });
}

/** DELETE /api/admin/blog-posts/:id */
export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/blog-posts/${id}`),
    onSuccess: (_data, id) => {
      // Drop the deleted post's detail rather than refetching it into a 404.
      queryClient.removeQueries({ queryKey: blogPostKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: blogPostKeys.lists() });
    },
  });
}
