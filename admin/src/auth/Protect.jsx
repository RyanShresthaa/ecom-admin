import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Gates dashboard routes behind an authenticated session.
 * Optional `permission` prop also enforces RBAC (redirects to `/` with a toast).
 */
export function ProtectedRoute({ permission }) {
  const { isAuthenticated, isRestoring } = useAuth()
  const { can } = usePermissions()
  const location = useLocation()
  const deniedToastShown = useRef(false)
  const permissionDenied = Boolean(permission && isAuthenticated && !can(permission))

  useEffect(() => {
    if (!permissionDenied || deniedToastShown.current) return
    deniedToastShown.current = true
    toast.error('You do not have access to that page.')
  }, [permissionDenied])

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (permissionDenied) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
