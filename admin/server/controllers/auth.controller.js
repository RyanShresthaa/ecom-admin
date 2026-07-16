import { randomBytes } from 'node:crypto'

import { getDb, saveDb, updateDb } from '../db.js'
import { toPublicUser } from '../utils.js'

// Auth helper: resolves a public user object from bearer token.
function getUserFromToken(db, token) {
  if (!token) return null
  const userId = db.sessions[token]
  if (!userId) return null
  const user = db.users.find((u) => u.id === userId)
  return user ? toPublicUser(user) : null
}

// Login page: validates credentials, creates session token, returns user + token.
export async function login(req, res) {
  const db = getDb()
  const { email, password } = req.body || {}
  const match = db.users.find((u) => u.email === email && u.password === password)
  if (!match) return res.status(401).json({ message: 'Invalid email or password' })

  const token = randomBytes(32).toString('hex')
  db.sessions[token] = match.id
  await saveDb()

  res.json({ user: toPublicUser(match), token })
}

// Session restore: validates token and returns current user profile.
export async function session(req, res) {
  const db = getDb()
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const user = getUserFromToken(db, token)
  if (!user) return res.status(401).json({ message: 'Session expired' })

  res.json({ user })
}

// requireAuth middleware in routes.js sets req.token
// Logout action: invalidates the current session token.
export async function logout(req, res) {
  await updateDb((db) => {
    delete db.sessions[req.token]
  })
  res.json({ success: true })
}

// Forgot password page: issues local reset token for matching email.
export async function forgotPassword(req, res) {
  const db = getDb()
  const { email } = req.body || {}

  const user = db.users.find((u) => u.email === email)
  if (!user) return res.status(404).json({ message: 'No account found with that email' })

  // Dev/local reset token (no email sending)
  const token = randomBytes(16).toString('hex')
  db.resetTokens[token] = { email, expires: Date.now() + 3600000 }
  await saveDb()

  res.json({ success: true, devResetToken: token })
}

// Reset password page: verifies reset token and updates password.
export async function resetPassword(req, res) {
  const db = getDb()
  const { token, password } = req.body || {}

  const reset = db.resetTokens[token]
  if (!reset || reset.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' })
  }

  const user = db.users.find((u) => u.email === reset.email)
  if (!user) return res.status(400).json({ message: 'Invalid reset token' })

  user.password = password
  delete db.resetTokens[token]
  await saveDb()

  res.json({ success: true })
}

