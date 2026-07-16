import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'

// Auth mutation: sign in with credentials.
export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.login(payload),
    onError: (err) => toast.error(err.message || 'Failed to sign in'),
  })
}

// Auth mutation: request password reset token/link.
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.requestPasswordReset(payload),
    onError: (err) => toast.error(err.message || 'Something went wrong'),
  })
}

// Auth mutation: submit password reset payload.
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload) => api.auth.resetPassword(payload),
    onError: (err) => toast.error(err.message || 'Failed to reset password'),
  })
}
