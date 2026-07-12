import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

const TITLES = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/products': 'Products',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/account': 'Account settings',
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/customers/')) return 'Customer details'
  if (pathname.startsWith('/products/')) return 'Product details'
  if (pathname.startsWith('/orders/')) return 'Order details'
  return TITLES[pathname] ?? 'Matina Crafts'
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[248px]">
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
