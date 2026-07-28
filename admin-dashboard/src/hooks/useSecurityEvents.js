import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useSecurityEventsQuery(params) {
  return useQuery({
    queryKey: queryKeys.securityEvents.list(params),
    queryFn: () => api.securityEvents.list(params),
  })
}
