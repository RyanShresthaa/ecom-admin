import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useGlobalSearch(query, { enabled = true } = {}) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: () => api.search({ query: trimmed, limit: 5 }),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
  })
}
