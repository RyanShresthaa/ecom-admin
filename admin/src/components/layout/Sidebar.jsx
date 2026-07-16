import { NavLink } from 'react-router-dom'
import {
  SquaresFour,
  Package,
  ShoppingCartSimple,
  Stack,
  GearSix,
  Lightning,
  X,
  Users,
  Storefront,
} from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

// Primary workspace navigation links, each gated by an RBAC permission.
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: SquaresFour, end: true, permission: PERMISSIONS.DASHBOARD_VIEW },
  { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
  { to: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
  { to: '/live-store', label: 'Live store', icon: Storefront, permission: PERMISSIONS.PRODUCTS_VIEW },
  { to: '/orders', label: 'Orders', icon: ShoppingCartSimple, permission: PERMISSIONS.ORDERS_VIEW },
  { to: '/inventory', label: 'Inventory', icon: Stack, permission: PERMISSIONS.INVENTORY_VIEW },
  { to: '/settings', label: 'Settings', icon: GearSix, permission: PERMISSIONS.SETTINGS_VIEW },
]

// Left navigation rail for all dashboard pages; slides in as a drawer on mobile.
export function Sidebar({ open, onClose }) {
  const { can } = usePermissions()
  // Hide nav items the current role is not allowed to access.
  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission))

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[248px] flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Lightning size={16} weight="fill" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Matina Crafts</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-hidden px-3 py-3">
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </p>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 h-5 w-0.5 rounded-r-full bg-primary opacity-0 transition-opacity',
                      isActive && 'opacity-100'
                    )}
                  />
                  <item.icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-3 shrink-0 rounded-lg bg-sidebar-accent/60 p-3.5">
          <p className="text-xs font-semibold text-white">Matina Crafts</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-sidebar-foreground/60">
            Handcrafted goods · Admin
          </p>
        </div>
      </aside>
    </>
  )
}
