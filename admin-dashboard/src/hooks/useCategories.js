import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.list,
    queryFn: () => api.categories.list(),
  })
}

function invalidateCategoryCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.categories })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.categories.create(payload),
    onSuccess: () => {
      invalidateCategoryCaches(queryClient)
      toast.success('Category created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create category'),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.categories.update(id, payload),
    onSuccess: () => {
      invalidateCategoryCaches(queryClient)
      toast.success('Category updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update category'),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.categories.remove(id),
    onSuccess: () => {
      invalidateCategoryCaches(queryClient)
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(err.message || 'Failed to delete category'),
  })
}
