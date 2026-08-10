import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useReturnsQuery() {
  return useQuery({
    queryKey: queryKeys.returns.list,
    queryFn: () => api.returns.list(),
  })
}

export function useUpdateReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.returns.update(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      const verb = variables?.status === 'approved' ? 'approved' : 'declined'
      toast.success(`Return ${verb} — customer notified`)
    },
    onError: (err) => toast.error(err.message || 'Failed to update return'),
  })
}
