import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'

// Route guard for all dashboard pages — requires login and optionally a specific RBAC permission.
export function ProtectedRoute({ permission }) {
  const { isAuthenticated, isRestoring } = useAuth()
  const { can } = usePermissions()
  const location = useLocation()
  const deniedToastShown = useRef(false)
  const permissionDenied = Boolean(permission && isAuthenticated && !can(permission))

  // Show a one-time toast when the user is logged in but lacks the required permission.
  useEffect(() => {
    if (!permissionDenied || deniedToastShown.current) return
    deniedToastShown.current = true
    toast.error('You do not have access to that page.')
  }, [permissionDenied])

  // Wait for persisted session restore before deciding where to redirect.
  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    )
  }

  // Unauthenticated visitors are sent to login with the original path preserved.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Authenticated but unauthorized users are bounced to the dashboard home.
  if (permissionDenied) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
