import { usePermissions } from '@/hooks/usePermissions'

/**
 * Declaratively shows/hides UI based on the current user's role.
 *
 *   <RequirePermission permission="products:write">
 *     <Button>Add product</Button>
 *   </RequirePermission>
 *
 * Renders `fallback` (default: nothing) when the permission is missing —
 * use this for hiding actions a role can't perform, not for protecting
 * entire pages/routes (use <ProtectedRoute permission="..."> for that).
 */
export function RequirePermission({ permission, fallback = null, children }) {
  const { can } = usePermissions()
  return can(permission) ? children : fallback
}
