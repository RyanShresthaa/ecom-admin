import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Shop from '@/pages/Shop'
import ProductDetail from '@/pages/ProductDetail'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Account from '@/pages/Account'
import Cart from '@/pages/Cart'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'

// Root router — shop, product, cart, auth, and account pages.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Shop />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="account" element={<Account />} />
      </Route>
    </Routes>
  )
}
