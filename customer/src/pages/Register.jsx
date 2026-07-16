import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Customer registration page — creates account then auto-logs in.
export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in — skip registration form.
  if (user) return <Navigate to="/account" replace />

  // Submit handler — register via API then redirect to account.
  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ name, email, password })
      navigate('/account')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" style={{ maxWidth: 420 }} onSubmit={onSubmit}>
      <h1 style={{ margin: 0 }}>Create customer account</h1>
      <label className="field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="field">
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label className="field">
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}
