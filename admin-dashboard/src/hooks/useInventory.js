import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useInventoryQuery(params) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => api.inventory.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useWarehousesQuery() {
  return useQuery({
    queryKey: queryKeys.inventory.warehouses,
    queryFn: () => api.inventory.warehouses(),
  })
}

function invalidateInventory(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
}

export function useAddStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.inventory.add(payload),
    onSuccess: () => {
      invalidateInventory(queryClient)
      toast.success('Stock added')
    },
    onError: (err) => toast.error(err.message || 'Failed to add stock'),
  })
}

export function useRemoveStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.inventory.remove(payload),
    onSuccess: () => {
      invalidateInventory(queryClient)
      toast.success('Stock removed')
    },
    onError: (err) => toast.error(err.message || 'Failed to remove stock'),
  })
}

export function useTransferStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.inventory.transfer(payload),
    onSuccess: () => {
      invalidateInventory(queryClient)
      toast.success('Stock transferred')
    },
    onError: (err) => toast.error(err.message || 'Failed to transfer stock'),
  })
}
