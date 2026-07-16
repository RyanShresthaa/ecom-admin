import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { downloadCsv, rowsToCsv } from '@/lib/csv'
import { paymentMethodLabel } from '@/lib/paymentMethod'
import { queryKeys } from '@/lib/queryKeys'

// Orders page query: fetch paginated orders list.
export function useOrdersQuery(params) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => api.orders.list(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

// Order detail query: fetch one order record by id.
export function useOrderQuery(id) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => api.orders.getById(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

// Cache helper: invalidates order-adjacent queries after order mutations.
function invalidateOrderRelatedQueries(queryClient, orderId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
  queryClient.invalidateQueries({ queryKey: ['products', 'analytics'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
  }
}

// Mutation: updates a single order status with optimistic cache refresh.
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

// Mutation: applies bulk order status update.
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

// Mutation: adds internal note to an order.
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

// Mutation: creates a new order from admin panel.
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

// Mutation: exports one month of orders as CSV download.
export function useExportOrdersMonthCsv() {
  return useMutation({
    mutationFn: (payload) => api.orders.exportMonthCsv(payload),
    onSuccess: ({ rows, year, month }) => {
      const headers = [
        'orderId',
        'date',
        'customerId',
        'customerName',
        'customerEmail',
        'paymentMethod',
        'paymentStatus',
        'deliveryStatus',
        'itemCount',
        'totalAmount',
      ]
      const csvRows = rows.map((r) => ({
        ...r,
        paymentMethod: paymentMethodLabel(r.paymentMethod),
        date: r.date ? new Date(r.date).toISOString() : '',
      }))
      const csv = rowsToCsv(headers, csvRows)
      downloadCsv(csv, `orders-${year}-${String(month).padStart(2, '0')}.csv`)
      toast.success(`Exported ${rows.length} orders for ${year}-${String(month).padStart(2, '0')}`)
    },
    onError: (err) => toast.error(err.message || 'Failed to export orders'),
  })
}
