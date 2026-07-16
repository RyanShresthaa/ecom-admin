import { usePermissions } from '@/hooks/usePermissions'

// Conditionally renders children when the current user has a permission — for buttons, menu items, etc.
export function RequirePermission({ permission, fallback = null, children }) {
  const { can } = usePermissions()
  return can(permission) ? children : fallback
}
