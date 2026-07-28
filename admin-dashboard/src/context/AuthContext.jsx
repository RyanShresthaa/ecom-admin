import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { api } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        // Cookie-only session — httpOnly accessToken drives /user/user-details
        const profile = await api.auth.me()
        if (!cancelled) {
          setUser(profile)
          setIsAuthenticated(true)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setIsAuthenticated(false)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function login(email, password) {
    await api.auth.login(email, password)
    const profile = await api.auth.me()
    setUser(profile)
    setIsAuthenticated(true)
    return profile
  }

  async function logout() {
    await api.auth.logout()
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
