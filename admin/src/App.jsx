import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/auth/Protect'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/common/PageLoader'
import { PERMISSIONS } from '@/lib/permissions'

const Login = lazy(() => import('@/features/Auth/Login'))
const ForgotPassword = lazy(() => import('@/features/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/features/Auth/ResetPassword'))

const Dashboard = lazy(() => import('@/features/Dashboard'))
const Customers = lazy(() => import('@/features/Customers'))
const CustomerDetail = lazy(() => import('@/features/Customers/Detail'))
const Products = lazy(() => import('@/features/Products'))
const ProductDetail = lazy(() => import('@/features/Products/Detail'))
const Orders = lazy(() => import('@/features/Orders'))
const OrderDetail = lazy(() => import('@/features/Orders/Detail'))
const Inventory = lazy(() => import('@/features/Inventory'))
const LiveStore = lazy(() => import('@/features/LiveStore'))
const Settings = lazy(() => import('@/features/Settings'))
const Profile = lazy(() => import('@/features/Profile'))
const Account = lazy(() => import('@/features/Account'))

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LazyPage>
            <Login />
          </LazyPage>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <LazyPage>
            <ForgotPassword />
          </LazyPage>
        }
      />
      <Route
        path="/reset-password"
        element={
          <LazyPage>
            <ResetPassword />
          </LazyPage>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            index
            element={
              <LazyPage>
                <Dashboard />
              </LazyPage>
            }
          />
          <Route
            path="customers"
            element={
              <LazyPage>
                <Customers />
              </LazyPage>
            }
          />
          <Route
            path="customers/:id"
            element={
              <LazyPage>
                <CustomerDetail />
              </LazyPage>
            }
          />
          <Route
            path="products"
            element={
              <LazyPage>
                <Products />
              </LazyPage>
            }
          />
          <Route
            path="products/:id"
            element={
              <LazyPage>
                <ProductDetail />
              </LazyPage>
            }
          />
          <Route
            path="orders"
            element={
              <LazyPage>
                <Orders />
              </LazyPage>
            }
          />
          <Route
            path="orders/:id"
            element={
              <LazyPage>
                <OrderDetail />
              </LazyPage>
            }
          />
          <Route
            path="inventory"
            element={
              <LazyPage>
                <Inventory />
              </LazyPage>
            }
          />
          <Route
            path="live-store"
            element={
              <LazyPage>
                <LiveStore />
              </LazyPage>
            }
          />
          <Route element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} />}>
            <Route
              path="settings"
              element={
                <LazyPage>
                  <Settings />
                </LazyPage>
              }
            />
          </Route>
          <Route
            path="profile"
            element={
              <LazyPage>
                <Profile />
              </LazyPage>
            }
          />
          <Route
            path="account"
            element={
              <LazyPage>
                <Account />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
