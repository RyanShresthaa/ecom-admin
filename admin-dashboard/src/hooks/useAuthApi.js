import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.login(payload),
    onError: (err) => toast.error(err.message || 'Failed to sign in'),
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.requestPasswordReset(payload),
    onError: (err) => toast.error(err.message || 'Something went wrong'),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.resetPassword(payload),
    onError: (err) => toast.error(err.message || 'Failed to reset password'),
  })
}
