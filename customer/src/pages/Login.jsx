import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Customer login page — email/password form, redirects to account on success.
export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in — skip login form.
  if (user) return <Navigate to="/account" replace />

  // Submit handler — calls auth context login then navigates to account.
  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate('/account')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" style={{ maxWidth: 420 }} onSubmit={onSubmit}>
      <h1 style={{ margin: 0 }}>Customer login</h1>
      <p className="muted">Shop accounts only. Staff dashboard is a different app.</p>
      <label className="field">
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label className="field">
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="muted">
        No account? <Link to="/register">Register</Link>
      </p>
    </form>
  )
}
