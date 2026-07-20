import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useBlogPostsQuery(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.blog.list(params),
    queryFn: () => api.blog.list(params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useBlogPostQuery(id) {
  return useQuery({
    queryKey: queryKeys.blog.detail(id),
    queryFn: () => api.blog.getById(id),
    enabled: Boolean(id),
  })
}

export function useCreateBlogPostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.blog.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      toast.success('Blog post created')
    },
    onError: (e) => toast.error(e.message || 'Could not create post'),
  })
}

export function useUpdateBlogPostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.blog.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(id) })
      toast.success('Blog post saved')
    },
    onError: (e) => toast.error(e.message || 'Could not save post'),
  })
}

export function useDeleteBlogPostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.blog.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      toast.success('Blog post deleted')
    },
    onError: (e) => toast.error(e.message || 'Could not delete post'),
  })
}
