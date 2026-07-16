import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { downloadCsv, rowsToCsv } from '@/lib/csv'
import { paymentMethodLabel } from '@/lib/paymentMethod'
import { queryKeys } from '@/lib/queryKeys'

// Customers page query: fetch paginated customers list.
export function useCustomersQuery(params) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => api.customers.list(params),
    placeholderData: keepPreviousData,
  })
}

// Customer detail query: fetch one customer profile.
export function useCustomerQuery(id) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api.customers.getById(id),
    enabled: Boolean(id),
  })
}

// Customer orders query: fetch paginated orders for selected customer.
export function useCustomerOrdersQuery(customerId, params) {
  return useQuery({
    queryKey: queryKeys.customers.orders(customerId, params),
    queryFn: () => api.customers.orders(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  })
}

// Mutation: creates a new customer record.
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.customers.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success('Customer created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create customer'),
  })
}

// Mutation: updates customer fields.
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

// Mutation: exports customer profile + orders CSV.
export function useExportCustomerCsv() {
  return useMutation({
    mutationFn: (id) => api.customers.exportDetailCsv(id),
    onSuccess: ({ rows, filename, customer }) => {
      const headers = [
        'section',
        'customerId',
        'name',
        'email',
        'phone',
        'status',
        'orderCount',
        'lifetimeValue',
        'avgOrderValue',
        'addresses',
        'orderId',
        'orderDate',
        'paymentMethod',
        'paymentStatus',
        'deliveryStatus',
        'orderTotal',
      ]
      const csvRows = rows.map((r) => ({
        ...r,
        paymentMethod: paymentMethodLabel(r.paymentMethod),
        orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
      }))
      downloadCsv(rowsToCsv(headers, csvRows), filename)
      toast.success(`Exported ${customer?.name || 'customer'} details`)
    },
    onError: (err) => toast.error(err.message || 'Failed to export customer'),
  })
}
