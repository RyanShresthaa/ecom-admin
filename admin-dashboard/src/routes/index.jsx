import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/common/PageLoader'
import { RequireAuth } from '@/context/AuthContext'
import {
  Dashboard,
  Products,
  Categories,
  Orders,
  Inventory,
  Coupons,
  Returns,
  Feedback,
  GoogleReviews,
  Blog,
  Newsletter,
  AuditLogs,
  SecurityEvents,
  Settings,
  Profile,
  Login,
} from '@/routes/lazyPages'

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<PageLoader />}>
              <Products />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<PageLoader />}>
              <Categories />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<PageLoader />}>
              <Orders />
            </Suspense>
          }
        />
        <Route
          path="inventory"
          element={
            <Suspense fallback={<PageLoader />}>
              <Inventory />
            </Suspense>
          }
        />
        <Route
          path="coupons"
          element={
            <Suspense fallback={<PageLoader />}>
              <Coupons />
            </Suspense>
          }
        />
        <Route
          path="returns"
          element={
            <Suspense fallback={<PageLoader />}>
              <Returns />
            </Suspense>
          }
        />
        <Route
          path="feedback"
          element={
            <Suspense fallback={<PageLoader />}>
              <Feedback />
            </Suspense>
          }
        />
        <Route
          path="google-reviews"
          element={
            <Suspense fallback={<PageLoader />}>
              <GoogleReviews />
            </Suspense>
          }
        />
        <Route
          path="blog"
          element={
            <Suspense fallback={<PageLoader />}>
              <Blog />
            </Suspense>
          }
        />
        <Route
          path="newsletter"
          element={
            <Suspense fallback={<PageLoader />}>
              <Newsletter />
            </Suspense>
          }
        />
        <Route
          path="audit"
          element={
            <Suspense fallback={<PageLoader />}>
              <AuditLogs />
            </Suspense>
          }
        />
        <Route
          path="security"
          element={
            <Suspense fallback={<PageLoader />}>
              <SecurityEvents />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
