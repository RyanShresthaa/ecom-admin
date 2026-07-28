import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useGoogleReviewsQuery() {
  return useQuery({
    queryKey: queryKeys.googleReviews.list,
    queryFn: () => api.googleReviews.list(),
  })
}

export function useSetGoogleReviewVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isVisible }) => api.googleReviews.setVisibility(id, isVisible),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.googleReviews.all })
      toast.success(variables.isVisible ? 'Review shown on storefront' : 'Review hidden')
    },
    onError: (err) => toast.error(err.message || 'Failed to update review'),
  })
}

export function useBulkGoogleReviewVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (isVisible) => api.googleReviews.setAllVisibility(isVisible),
    onSuccess: (_data, isVisible) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.googleReviews.all })
      toast.success(isVisible ? 'All reviews shown' : 'All reviews hidden')
    },
    onError: (err) => toast.error(err.message || 'Failed to update reviews'),
  })
}

export function useSyncGoogleReviews() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.googleReviews.syncFromGoogle(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.googleReviews.all })
      toast.success(res.message || 'Synced from Google Places')
    },
    onError: (err) => toast.error(err.message || 'Failed to sync Google reviews'),
  })
}
