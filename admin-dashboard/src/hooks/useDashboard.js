import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => api.dashboard.stats(),
  })
}

export function useSalesSeries() {
  return useQuery({
    queryKey: queryKeys.dashboard.sales,
    queryFn: () => api.dashboard.salesSeries(),
  })
}

export function useRecentOrders(params) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentOrders(params),
    queryFn: () => api.dashboard.recentOrders(params),
    placeholderData: keepPreviousData,
  })
}
