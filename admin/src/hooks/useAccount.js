import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'

// Account page query: fetch authenticated user's account profile.
export function useAccountQuery() {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.account.detail,
    queryFn: () => api.account.get(token),
    enabled: Boolean(token),
  })
}

// Account page mutation: update profile fields and local auth snapshot.
export function useUpdateAccount() {
  const { token, updateUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => api.account.update(token, payload),
    onSuccess: (user) => {
      updateUser(user)
      queryClient.setQueryData(queryKeys.account.detail, user)
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(err.message || 'Failed to update profile'),
  })
}

// Account security mutation: change current user's password.
export function useUpdatePassword() {
  const { token } = useAuth()

  return useMutation({
    mutationFn: (payload) => api.account.updatePassword(token, payload),
    onSuccess: () => toast.success('Password updated'),
    onError: (err) => toast.error(err.message || 'Failed to update password'),
  })
}
