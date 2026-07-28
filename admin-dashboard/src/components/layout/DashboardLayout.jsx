import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

const TITLES = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/coupons': 'Coupons',
  '/returns': 'Returns',
  '/feedback': 'Feedback',
  '/google-reviews': 'Google reviews',
  '/blog': 'Journal',
  '/newsletter': 'Newsletter',
  '/audit': 'Audit logs',
  '/security': 'Security events',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'Admin'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
