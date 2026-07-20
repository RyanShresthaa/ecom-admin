import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const CartContext = createContext(null)

// Cart provider — loads basket, validates stock, and exposes add/update/remove.
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = useCallback((message) => {
    setToast(message)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(''), 3500)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await api.getCart()
      setItems(res.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload cart after auth restore / login (guest → user merge happens server-side on login flows elsewhere).
  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, user?.id, refresh])

  // Validate stock on load and whenever items change count (soft check, no autofix).
  const validate = useCallback(async (autofix = false) => {
    try {
      const res = await api.validateCart(autofix)
      setIssues(res.data?.issues || [])
      if (autofix) await refresh()
      return res.data
    } catch {
      setIssues([])
      return null
    }
  }, [refresh])

  useEffect(() => {
    if (loading || !items.length) {
      setIssues([])
      return
    }
    validate(false)
  }, [items.length, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = useCallback(
    async ({ productId, quantity = 1, variantId }) => {
      setBusy(true)
      try {
        await api.addToCart({ productId, quantity, variantId })
        await refresh()
        showToast('Added to cart')
        return { ok: true }
      } catch (e) {
        showToast(e.message)
        return { ok: false, message: e.message }
      } finally {
        setBusy(false)
      }
    },
    [refresh, showToast]
  )

  const updateQty = useCallback(
    async (cartItemId, quantity) => {
      setBusy(true)
      try {
        await api.updateCart({ _id: cartItemId, quantity })
        await refresh()
        await validate(false)
      } catch (e) {
        showToast(e.message)
      } finally {
        setBusy(false)
      }
    },
    [refresh, validate, showToast]
  )

  const removeItem = useCallback(
    async (cartItemId) => {
      setBusy(true)
      try {
        await api.removeCart(cartItemId)
        await refresh()
      } catch (e) {
        showToast(e.message)
      } finally {
        setBusy(false)
      }
    },
    [refresh, showToast]
  )

  const fixStockIssues = useCallback(async () => {
    setBusy(true)
    try {
      const data = await validate(true)
      showToast(
        data?.issues?.length
          ? 'Cart updated to match available stock'
          : 'Cart looks good'
      )
      return data
    } finally {
      setBusy(false)
    }
  }, [validate, showToast])

  const count = useMemo(
    () => items.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      issues,
      loading,
      busy,
      count,
      toast,
      refresh,
      addItem,
      updateQty,
      removeItem,
      validate,
      fixStockIssues,
      showToast,
    }),
    [
      items,
      issues,
      loading,
      busy,
      count,
      toast,
      refresh,
      addItem,
      updateQty,
      removeItem,
      validate,
      fixStockIssues,
      showToast,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
