import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useSellerRequestsQuery() {
  return useQuery({
    queryKey: queryKeys.sellers.requests,
    queryFn: () => api.sellers.requests(),
  })
}

export function useApproveSeller() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.sellers.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all })
      toast.success('Seller approved')
    },
    onError: (err) => toast.error(err.message || 'Approve failed'),
  })
}

export function useRejectSeller() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.sellers.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all })
      toast.success('Seller rejected')
    },
    onError: (err) => toast.error(err.message || 'Reject failed'),
  })
}
