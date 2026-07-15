'use client'

import { Suspense } from 'react'

import Login from '@/features/Auth/Login'
import { PageLoader } from '@/components/common/PageLoader'

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Login />
    </Suspense>
  )
}
