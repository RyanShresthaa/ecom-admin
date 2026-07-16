import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

// Inventory page query: fetch paginated inventory rows.
export function useInventoryQuery(params) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => api.inventory.list(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

// Movements tab query: fetch stock movement history.
export function useStockMovementsQuery(params) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(params),
    queryFn: () => api.inventory.movements(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

// Reorder tab query: fetch low-stock suggestions.
export function useReorderSuggestionsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.reorder(params),
    queryFn: () => api.inventory.reorderSuggestions(params),
    staleTime: 15_000,
  })
}

// Purchase orders tab query: fetch paginated PO list.
export function usePurchaseOrdersQuery(params) {
  return useQuery({
    queryKey: queryKeys.inventory.purchaseOrders.list(params),
    queryFn: () => api.inventory.purchaseOrders.list(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

// Query: fetch adjustment reason options.
export function useAdjustmentReasonsQuery() {
  return useQuery({
    queryKey: ['inventory', 'adjustment-reasons'],
    queryFn: () => api.inventory.adjustmentReasons(),
    staleTime: Infinity,
  })
}

// Query: fetch available warehouse options.
export function useWarehousesQuery() {
  return useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => api.inventory.warehouses(),
    staleTime: 5 * 60 * 1000,
  })
}

// Mutation: perform manual stock adjustment.
export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.inventory.adjust(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success('Stock adjusted')
    },
    onError: (err) => toast.error(err.message || 'Failed to adjust stock'),
  })
}

// Mutation: create new purchase order draft.
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.inventory.purchaseOrders.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Purchase order created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create purchase order'),
  })
}

// Mutation: transition purchase order status.
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, author }) =>
      api.inventory.purchaseOrders.updateStatus(id, { status, author }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success('Purchase order updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update purchase order'),
  })
}
