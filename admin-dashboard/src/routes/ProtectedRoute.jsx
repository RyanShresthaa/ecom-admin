import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { PageLoader } from '@/components/common/PageLoader'

/**
 * Wraps a set of routes (via <Outlet>) and:
 *  - shows a loader while a stored session is being restored
 *  - redirects to /login (preserving the intended destination) if signed out
 *  - optionally redirects to "/" if the user lacks `permission`
 *
 * Usage in the route tree:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<DashboardLayout />}>
 *       <Route index element={...} />
 *       <Route element={<ProtectedRoute permission="settings:view" />}>
 *         <Route path="settings" element={...} />
 *       </Route>
 *     </Route>
 *   </Route>
 */
export function ProtectedRoute({ permission }) {
  const { isAuthenticated, isRestoring } = useAuth()
  const { can } = usePermissions()
  const location = useLocation()

  const permissionDenied = isAuthenticated && permission && !can(permission)

  useEffect(() => {
    if (permissionDenied) {
      toast.error("You don't have permission to view that page.")
    }
  }, [permissionDenied, location.pathname])

  if (isRestoring) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (permissionDenied) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
