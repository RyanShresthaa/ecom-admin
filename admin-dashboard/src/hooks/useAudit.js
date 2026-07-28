import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useAuditLogsQuery(params) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => api.audit.list(params),
  })
}
