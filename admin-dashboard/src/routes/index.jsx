import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/common/PageLoader'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PERMISSIONS } from '@/lib/permissions'
import {
  Dashboard,
  Products,
  ProductDetail,
  Customers,
  CustomerDetail,
  Orders,
  OrderDetail,
  Inventory,
  Settings,
  Profile,
  Account,
  Login,
  ForgotPassword,
  ResetPassword,
} from '@/routes/lazyPages'

function withSuspense(Page) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={withSuspense(Login)} />
      <Route path="forgot-password" element={withSuspense(ForgotPassword)} />
      <Route path="reset-password" element={withSuspense(ResetPassword)} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={withSuspense(Dashboard)} />
          <Route path="products" element={withSuspense(Products)} />
          <Route path="products/:id" element={withSuspense(ProductDetail)} />
          <Route path="customers" element={withSuspense(Customers)} />
          <Route path="customers/:id" element={withSuspense(CustomerDetail)} />
          <Route path="orders" element={withSuspense(Orders)} />
          <Route path="orders/:id" element={withSuspense(OrderDetail)} />
          <Route path="inventory" element={withSuspense(Inventory)} />
          <Route path="profile" element={withSuspense(Profile)} />
          <Route path="account" element={withSuspense(Account)} />

          <Route element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} />}>
            <Route path="settings" element={withSuspense(Settings)} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
