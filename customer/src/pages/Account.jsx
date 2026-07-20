import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Account page — profile + note about cart reminder emails.
export default function Account() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="card stack" style={{ maxWidth: 480 }}>
      <h1 style={{ margin: 0 }}>My account</h1>
      <p>
        <strong>{user.name}</strong>
      </p>
      <p className="muted">{user.email}</p>
      <p className="muted">Role: {user.role || 'USER'}</p>
      <div className="card notify-box stack">
        <strong>Notifications</strong>
        <p className="muted" style={{ margin: 0 }}>
          If you leave items in your cart for a while, we may email a gentle reminder when the queue worker is
          running. Out-of-stock products can send a separate “back in stock” email when you use Notify me.
        </p>
      </div>
      {user.role === 'Admin' || user.role === 'Seller' ? (
        <p className="muted">
          You have a staff role. Manage the catalog in the admin app at{' '}
          <a href="http://localhost:5173/live-store">localhost:5173/live-store</a>.
        </p>
      ) : null}
    </div>
  )
}
