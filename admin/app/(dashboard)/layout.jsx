'use client'

import { Protect } from '@/auth/Protect'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function DashboardGroupLayout({ children }) {
  return (
    <Protect>
      <DashboardLayout>{children}</DashboardLayout>
    </Protect>
  )
}
