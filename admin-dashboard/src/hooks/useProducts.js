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

export function useProductOptionsQuery(params = { status: 'active' }) {
  return useQuery({
    queryKey: queryKeys.products.options(params),
    queryFn: () => api.products.options(params),
    staleTime: 30_000,
  })
}

export function useProductQuery(id) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.products.getById(id),
    enabled: Boolean(id),
  })
}

export function useProductAnalyticsQuery(id) {
  return useQuery({
    queryKey: queryKeys.products.analytics(id),
    queryFn: () => api.products.analytics(id),
    enabled: Boolean(id),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.products.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: ['products', 'options'] })
      toast.success('Product created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create product'),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.products.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) })
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

export function useUploadProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, imageDataUrl }) => api.products.uploadImage(id, { imageDataUrl }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) })
      toast.success('Image uploaded')
    },
    onError: (err) => toast.error(err.message || 'Failed to upload image'),
  })
}

export function useExportProductsCsv() {
  return useMutation({
    mutationFn: () => api.products.exportCsv(),
    onSuccess: ({ csv, filename }) => {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Products exported')
    },
    onError: (err) => toast.error(err.message || 'Failed to export products'),
  })
}

export function useImportProductsCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (csv) => api.products.importCsv({ csv }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: ['products', 'options'] })
      toast.success(`Imported ${result.imported} products`)
    },
    onError: (err) => toast.error(err.message || 'Failed to import products'),
  })
}
