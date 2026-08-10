import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useSettingsQuery(options = {}) {
  const { enabled, ...rest } = options
  return useQuery({
    queryKey: queryKeys.settings.detail,
    queryFn: () => api.settings.get(),
    staleTime: 0,
    refetchOnMount: 'always',
    // Allow LocaleProvider to gate on auth; Products page loads freely once logged in
    enabled: enabled !== undefined ? enabled : true,
    ...rest,
  })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.settings.save(payload),
    onSuccess: async (saved) => {
      // Apply saved region immediately so product NPR→USD/NPR display updates
      queryClient.setQueryData(queryKeys.settings.detail, saved)
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.detail })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      const region = saved?.regionMode === 'nepal' ? 'Nepal (NPR)' : 'United States (USD)'
      toast.success(`Settings saved · prices show as ${region}`)
    },
    onError: (err) => toast.error(err.message || 'Failed to save settings'),
  })
}
