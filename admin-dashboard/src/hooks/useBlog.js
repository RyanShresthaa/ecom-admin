import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useBlogPostsQuery() {
  return useQuery({
    queryKey: queryKeys.blog.list,
    queryFn: () => api.blog.list(),
  })
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.blog.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      toast.success('Post created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create post'),
  })
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.blog.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      toast.success('Post updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update post'),
  })
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.blog.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.all })
      toast.success('Post deleted')
    },
    onError: (err) => toast.error(err.message || 'Failed to delete post'),
  })
}
