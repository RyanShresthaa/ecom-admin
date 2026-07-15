'use client'

import { Protect } from '@/auth/Protect'
import { PERMISSIONS } from '@/lib/permissions'
import Settings from '@/features/Settings'

export default function SettingsPage() {
  return (
    <Protect permission={PERMISSIONS.SETTINGS_VIEW}>
      <Settings />
    </Protect>
  )
}
