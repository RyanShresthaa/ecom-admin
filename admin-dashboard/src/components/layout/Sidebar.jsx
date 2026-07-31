import { NavLink } from 'react-router-dom'
import {
  SquaresFour,
  Package,
  ShoppingCartSimple,
  Stack,
  GearSix,
  Lightning,
  X,
  Tag,
  Ticket,
  ArrowCounterClockwise,
  ChatCircleText,
  Star,
  ClockCounterClockwise,
  ShieldWarning,
  GoogleLogo,
  ArticleNyTimes,
  EnvelopeSimple,
} from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: SquaresFour, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/orders', label: 'Orders', icon: ShoppingCartSimple },
  { to: '/inventory', label: 'Inventory', icon: Stack },
  { to: '/coupons', label: 'Coupons', icon: Ticket },
  { to: '/returns', label: 'Returns', icon: ArrowCounterClockwise },
  { to: '/feedback', label: 'Feedback', icon: ChatCircleText },
  { to: '/product-reviews', label: 'Product reviews', icon: Star },
  { to: '/google-reviews', label: 'Google reviews', icon: GoogleLogo },
  { to: '/blog', label: 'Journal', icon: ArticleNyTimes },
  { to: '/newsletter', label: 'Newsletter', icon: EnvelopeSimple },
  { to: '/audit', label: 'Audit logs', icon: ClockCounterClockwise },
  { to: '/security', label: 'Security events', icon: ShieldWarning },
  { to: '/settings', label: 'Settings', icon: GearSix },
]

export function Sidebar({ open, onClose }) {
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
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
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

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => (
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
      </aside>
    </>
  )
}
