import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCustomersQuery(params) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => api.customers.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerQuery(id) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api.customers.getById(id),
    enabled: Boolean(id),
  })
}

export function useCustomerOrdersQuery(customerId, params) {
  return useQuery({
    queryKey: queryKeys.customers.orders(customerId, params),
    queryFn: () => api.customers.orders(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.customers.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) })
      toast.success('Customer updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update customer'),
  })
}
