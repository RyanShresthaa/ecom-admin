import { useMemo } from 'react'

import { useAuth } from '@/context/AuthContext'
import { hasPermission, getAccessibleSections } from '@/lib/permissions'

/**
 * usePermissions() -> { role, can(permission), sections }
 *
 * Usage:
 *   const { can } = usePermissions()
 *   {can('products:write') && <Button>Add product</Button>}
 */
export function usePermissions() {
  const { role } = useAuth()

  return useMemo(
    () => ({
      role,
      can: (permission) => hasPermission(role, permission),
      sections: getAccessibleSections(role),
    }),
    [role]
  )
}
