import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

// Settings page query: fetch current settings document.
export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.detail,
    queryFn: () => api.settings.get(),
  })
}

// Settings page mutation: persist settings changes.
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.settings.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.detail })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success('Settings saved')
    },
    onError: (err) => toast.error(err.message || 'Failed to save settings'),
  })
}
