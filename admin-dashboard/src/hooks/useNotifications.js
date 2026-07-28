import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api.notifications.list(),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(queryKeys.notifications.all, (prev) =>
        Array.isArray(prev)
          ? prev.map((n) => (String(n.id) === String(id) ? { ...n, read: true } : n))
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: (next) => {
      if (Array.isArray(next)) {
        queryClient.setQueryData(queryKeys.notifications.all, next)
      } else {
        queryClient.setQueryData(queryKeys.notifications.all, (prev) =>
          Array.isArray(prev) ? prev.map((n) => ({ ...n, read: true })) : prev,
        )
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
