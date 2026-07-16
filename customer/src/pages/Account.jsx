import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Account page — protected profile view for logged-in customers.
export default function Account() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Loading…</p>
  // Redirect guests to login before showing profile.
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="card stack" style={{ maxWidth: 480 }}>
      <h1 style={{ margin: 0 }}>My account</h1>
      <p>
        <strong>{user.name}</strong>
      </p>
      <p className="muted">{user.email}</p>
      <p className="muted">Role: {user.role || 'USER'}</p>
      {user.role === 'Admin' || user.role === 'Seller' ? (
        <p className="muted">
          You have a staff role. Manage the catalog in the admin app at{' '}
          <a href="http://localhost:5173/live-store">localhost:5173/live-store</a>.
        </p>
      ) : null}
    </div>
  )
}
