import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { CUSTOMER_TOKEN_KEY } from '@/lib/http'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY)
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.me()
      setUser(res.data || res)
    } catch {
      localStorage.removeItem(CUSTOMER_TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    const token = res.data?.accesstoken
    if (!token) throw new Error('No access token returned')
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token)
    await refresh()
    return res
  }, [refresh])

  const register = useCallback(async (payload) => {
    await api.register(payload)
    return login(payload.email, payload.password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
