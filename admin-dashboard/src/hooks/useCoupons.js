import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCouponsQuery() {
  return useQuery({
    queryKey: queryKeys.coupons.list,
    queryFn: () => api.coupons.list(),
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.coupons.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      toast.success('Coupon created')
    },
    onError: (err) => toast.error(err.message || 'Failed to create coupon'),
  })
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.coupons.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      toast.success('Coupon updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update coupon'),
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.coupons.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      toast.success('Coupon deleted')
    },
    onError: (err) => toast.error(err.message || 'Failed to delete coupon'),
  })
}
