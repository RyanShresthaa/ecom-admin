import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

// Dashboard query: fetch KPI card metrics.
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => api.dashboard.stats(),
    staleTime: 10_000,
  })
}

// Dashboard query: fetch chart sales series.
export function useSalesSeries() {
  return useQuery({
    queryKey: queryKeys.dashboard.sales,
    queryFn: () => api.dashboard.salesSeries(),
    staleTime: 10_000,
  })
}

// Dashboard query: fetch recent orders table dataset.
export function useRecentOrders(params) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentOrders(params),
    queryFn: () => api.dashboard.recentOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}
