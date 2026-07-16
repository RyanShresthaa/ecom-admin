import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

import { api } from '@/lib/api'

const AuthContext = createContext(null)

const TOKEN_STORAGE_KEY = 'orbit_admin_token'

// Storage helper: safely read token from localStorage.
function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

// Storage helper: safely write/remove token in localStorage.
function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // localStorage can throw in private-browsing / disabled-storage contexts.
    // Session simply won't persist across reloads in that case.
  }
}

/**
 * Owns the authenticated session for the whole app: who's logged in, what
 * role they have, and whether we're still restoring a session from a
 * previously-stored token. All auth calls go through src/lib/api.js — point
 * VITE_API_URL at your backend when ready.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)

  // On first load, try to restore a session from a previously-stored token.
  useEffect(() => {
    const storedToken = readStoredToken()
    if (!storedToken) {
      setIsRestoring(false)
      return
    }

    let cancelled = false
    api.auth
      .session(storedToken)
      .then(({ user: restoredUser }) => {
        if (cancelled) return
        setUser(restoredUser)
        setToken(storedToken)
      })
      .catch(() => {
        if (cancelled) return
        writeStoredToken(null)
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Auth action: persist authenticated session in memory + storage.
  const login = useCallback(({ user: nextUser, token: nextToken }) => {
    setUser(nextUser)
    setToken(nextToken)
    writeStoredToken(nextToken)
  }, [])

  // Auth action: clear local session and best-effort invalidate server token.
  const logout = useCallback(() => {
    const currentToken = token
    setUser(null)
    setToken(null)
    writeStoredToken(null)
    if (currentToken) {
      // Fire-and-forget — the user is logged out locally regardless of
      // whether this network call succeeds.
      api.auth.logout(currentToken).catch(() => {})
    }
  }, [token])

  // Profile action: update current user snapshot in context.
  const updateUser = useCallback((nextUser) => {
    setUser(nextUser)
  }, [])

  // Context payload: stable auth contract consumed across the app.
  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      isAuthenticated: Boolean(user),
      isRestoring,
      login,
      logout,
      updateUser,
    }),
    [user, token, isRestoring, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  // Context hook: enforces usage under <AuthProvider>.
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
