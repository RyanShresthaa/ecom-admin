/**
 * Role-based access control
 * -----------------------------------------------------------------------
 * A small, dependency-free permission matrix. Every permission string
 * follows a `resource:action` convention (e.g. "products:write"), and a
 * role is just an array of permissions it grants — '*' grants everything.
 *
 * To add a new resource later (customers, shipping, discounts, ...), add
 * a couple of `xxx:view` / `xxx:write` strings here and extend the role
 * arrays below. Nothing else needs to change.
 * -----------------------------------------------------------------------
 */

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.VIEWER]: 'Viewer',
}

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',

  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_WRITE: 'customers:write',

  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_WRITE: 'products:write',

  ORDERS_VIEW: 'orders:view',
  ORDERS_WRITE: 'orders:write',

  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_WRITE: 'inventory:write',

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_WRITE: 'settings:write',
}

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.EDITOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_WRITE,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
  ],
}

/**
 * Returns true if `role` is allowed to perform `permission`.
 * Unknown roles are treated as having no access (fail closed).
 */
export function hasPermission(role, permission) {
  const granted = ROLE_PERMISSIONS[role]
  if (!granted) return false
  return granted.includes('*') || granted.includes(permission)
}

/** Nav items / routes a given role is allowed to see, used by the Sidebar. */
export function getAccessibleSections(role) {
  return {
    dashboard: hasPermission(role, PERMISSIONS.DASHBOARD_VIEW),
    customers: hasPermission(role, PERMISSIONS.CUSTOMERS_VIEW),
    products: hasPermission(role, PERMISSIONS.PRODUCTS_VIEW),
    orders: hasPermission(role, PERMISSIONS.ORDERS_VIEW),
    inventory: hasPermission(role, PERMISSIONS.INVENTORY_VIEW),
    settings: hasPermission(role, PERMISSIONS.SETTINGS_VIEW),
  }
}
