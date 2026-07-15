'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { api } from '@/lib/api'
import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  refreshAccessToken,
  setStoredTokens,
} from '@/lib/http'

const AuthContext = createContext(null)

/**
 * Owns the authenticated session for the whole app: who's logged in, what
 * role they have, and whether we're still restoring a session from a
 * previously-stored token.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const router = useRouter()

  // On first load, restore session (refresh access token if needed).
  useEffect(() => {
    let cancelled = false

    async function restore() {
      let access = getStoredToken()
      const refresh = getStoredRefreshToken()
      if (!access && !refresh) {
        if (!cancelled) setIsRestoring(false)
        return
      }

      try {
        // Prefer validating current access; on failure try refresh once.
        let restoredUser = null
        if (access) {
          try {
            const session = await api.auth.session(access)
            restoredUser = session.user
          } catch {
            access = null
          }
        }
        if (!restoredUser && refresh) {
          access = await refreshAccessToken()
          if (access) {
            const session = await api.auth.session(access)
            restoredUser = session.user
          }
        }
        if (cancelled) return
        if (restoredUser && access) {
          setUser(restoredUser)
          setToken(access)
        } else {
          clearStoredTokens()
          setUser(null)
          setToken(null)
        }
      } catch {
        if (!cancelled) {
          clearStoredTokens()
          setUser(null)
          setToken(null)
        }
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  // Keep React state in sync when http.js refreshes / clears tokens.
  useEffect(() => {
    function onToken(e) {
      const next = e.detail?.token
      if (next) setToken(next)
    }
    function onLogout() {
      setUser(null)
      setToken(null)
      clearStoredTokens()
      router.replace('/login')
    }
    window.addEventListener('orbit:auth-token', onToken)
    window.addEventListener('orbit:auth-logout', onLogout)
    return () => {
      window.removeEventListener('orbit:auth-token', onToken)
      window.removeEventListener('orbit:auth-logout', onLogout)
    }
  }, [router])

  const login = useCallback(({ user: nextUser, token: nextToken, refreshToken }) => {
    setUser(nextUser)
    setToken(nextToken)
    setStoredTokens({ accessToken: nextToken, refreshToken: refreshToken || null })
  }, [])

  const logout = useCallback(() => {
    const currentToken = token || getStoredToken()
    setUser(null)
    setToken(null)
    clearStoredTokens()
    if (currentToken) {
      api.auth.logout(currentToken).catch(() => {})
    }
  }, [token])

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser)
  }, [])

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
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
