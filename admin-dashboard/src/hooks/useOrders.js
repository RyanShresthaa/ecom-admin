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

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.orders.updateStatus(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) })
      const cancelled = String(variables.payload?.deliveryStatus || '').toLowerCase() === 'cancelled'
      const payment = variables.payload?.paymentStatus
      toast.success(
        cancelled
          ? data?._cancelMessage || 'Order cancelled (refunded if paid)'
          : payment
            ? `Payment marked ${payment}`
            : 'Order status updated',
      )
    },
    onError: (err) => toast.error(err.message || 'Failed to update order'),
  })
}
