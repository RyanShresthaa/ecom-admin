import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useProductsQuery(params) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => api.products.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.products.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success('Product created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create product'),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.products.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success('Product updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update product'),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.products.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success('Product deleted')
    },
    onError: (err) => toast.error(err.message || 'Failed to delete product'),
  })
}
