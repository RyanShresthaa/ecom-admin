import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useFeedbackQuery(params) {
  return useQuery({
    queryKey: queryKeys.feedback.list(params),
    queryFn: () => api.feedback.list(params),
  })
}
