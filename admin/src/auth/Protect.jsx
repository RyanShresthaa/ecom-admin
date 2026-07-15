'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { PageLoader } from '@/components/common/PageLoader'

/**
 * Client-side auth / permission gate for dashboard routes.
 * Preserves redirect-to-login with intended destination (via ?from=).
 */
export function Protect({ children, permission }) {
  const { isAuthenticated, isRestoring } = useAuth()
  const { can } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()

  const permissionDenied = isAuthenticated && permission && !can(permission)

  useEffect(() => {
    if (isRestoring) return

    if (!isAuthenticated) {
      const from = pathname && pathname !== '/login' ? `?from=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${from}`)
      return
    }

    if (permissionDenied) {
      toast.error("You don't have permission to view that page.")
      router.replace('/')
    }
  }, [isAuthenticated, isRestoring, permissionDenied, pathname, router])

  if (isRestoring) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <PageLoader />
  }

  if (permissionDenied) {
    return <PageLoader />
  }

  return children
}
