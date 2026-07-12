import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useOrdersQuery(params) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => api.orders.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useOrderQuery(id) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => api.orders.getById(id),
    enabled: Boolean(id),
  })
}

function invalidateOrderRelatedQueries(queryClient, orderId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
  queryClient.invalidateQueries({ queryKey: ['products', 'analytics'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats })
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
  }
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.orders.updateStatus(id, payload),
    onSuccess: (_data, variables) => {
      invalidateOrderRelatedQueries(queryClient, variables.id)
      toast.success('Order status updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update order'),
  })
}

export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.orders.bulkUpdateStatus(payload),
    onSuccess: (result) => {
      invalidateOrderRelatedQueries(queryClient)
      toast.success(`Updated ${result.updated} orders`)
    },
    onError: (err) => toast.error(err.message || 'Failed to update orders'),
  })
}

export function useAddOrderNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text, author }) => api.orders.addNote(id, { text, author }),
    onSuccess: (_data, variables) => {
      invalidateOrderRelatedQueries(queryClient, variables.id)
      toast.success('Note added')
    },
    onError: (err) => toast.error(err.message || 'Failed to add note'),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.orders.create(payload),
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient)
      toast.success('Order created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create order'),
  })
}
