import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useProductReviewsQuery(params) {
  return useQuery({
    queryKey: queryKeys.productReviews.list(params),
    queryFn: () => api.productReviews.list(params),
  })
}

export function useDeleteProductReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.productReviews.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productReviews.all })
      toast.success('Review deleted')
    },
    onError: (err) => toast.error(err.message || 'Failed to delete review'),
  })
}
