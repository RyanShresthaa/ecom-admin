import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useNewsletterSubscribersQuery() {
  return useQuery({
    queryKey: queryKeys.newsletter.list,
    queryFn: () => api.newsletter.list(),
  })
}

export async function downloadNewsletterCsv() {
  try {
    const blob = await api.newsletter.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'newsletter-subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  } catch (err) {
    toast.error(err.message || 'Failed to export CSV')
  }
}
