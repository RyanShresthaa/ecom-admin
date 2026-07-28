import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useGlobalSearchQuery(query) {
  return useQuery({
    queryKey: queryKeys.search.global(query),
    queryFn: () => api.search.global({ q: query, limit: 5 }),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 1000,
  })
}
