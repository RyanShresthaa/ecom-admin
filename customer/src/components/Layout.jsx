import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { CartNavLink, CartToast } from '@/components/CartBits'

// Shared storefront shell — top nav with cart badge and auth links.
export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="shell">
      <header className="nav">
        <Link to="/" className="brand">
          Matina Store
        </Link>
        <nav className="nav-links">
          <Link to="/">Shop</Link>
          <Link to="/blog">Blog</Link>
          <CartNavLink />
          {user ? (
            <>
              <Link to="/account">Hi, {user.name || user.email}</Link>
              <button type="button" className="btn" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">
                Customer login
              </Link>
              <Link className="btn btn-primary" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <Outlet />
      <CartToast />
      <p className="muted" style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
        Customer portal only. Staff use the admin app (port 5173) — separate login.
      </p>
    </div>
  )
}
