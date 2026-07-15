'use client'

import { Suspense } from 'react'

import ResetPassword from '@/features/Auth/ResetPassword'
import { PageLoader } from '@/components/common/PageLoader'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPassword />
    </Suspense>
  )
}
