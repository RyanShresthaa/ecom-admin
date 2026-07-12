import { lazy } from 'react'

export const Dashboard = lazy(() => import('@/pages/Dashboard/index.jsx'))
export const Products = lazy(() => import('@/pages/Products/index.jsx'))
export const ProductDetail = lazy(() => import('@/pages/Products/Detail.jsx'))
export const Customers = lazy(() => import('@/pages/Customers/index.jsx'))
export const CustomerDetail = lazy(() => import('@/pages/Customers/Detail.jsx'))
export const Orders = lazy(() => import('@/pages/Orders/index.jsx'))
export const OrderDetail = lazy(() => import('@/pages/Orders/Detail.jsx'))
export const Inventory = lazy(() => import('@/pages/Inventory/index.jsx'))
export const Settings = lazy(() => import('@/pages/Settings/index.jsx'))
export const Profile = lazy(() => import('@/pages/Profile/index.jsx'))
export const Account = lazy(() => import('@/pages/Account/index.jsx'))

export const Login = lazy(() => import('@/pages/Auth/Login.jsx'))
export const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword.jsx'))
export const ResetPassword = lazy(() => import('@/pages/Auth/ResetPassword.jsx'))
