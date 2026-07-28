import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile.detail,
    queryFn: () => api.profile.get(),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.profile.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail })
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update profile'),
  })
}
