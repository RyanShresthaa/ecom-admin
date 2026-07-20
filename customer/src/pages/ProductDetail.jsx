import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

// Product detail — add to cart with stock checks, or notify-me when out of stock.
export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addItem, busy } = useCart()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [variantId, setVariantId] = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifyBusy, setNotifyBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.product(id)
        if (alive) {
          setProduct(res.data)
          const variants = res.data?.variants || []
          if (variants.length) setVariantId(String(variants[0].id || variants[0]._id))
        }
      } catch (e) {
        if (alive) setError(e.message)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (user?.email) setNotifyEmail(user.email)
  }, [user?.email])

  const variants = product?.variants || []
  const selectedVariant = useMemo(
    () => variants.find((v) => String(v.id || v._id) === String(variantId)),
    [variants, variantId]
  )

  const stock = selectedVariant
    ? Number(selectedVariant.stock || 0)
    : Number(product?.stock || 0)
  const inStock = stock > 0
  const lowStock = inStock && stock <= 5

  async function onAdd() {
    if (!product) return
    if (variants.length && !variantId) {
      setError('Pick a variant')
      return
    }
    setError('')
    const result = await addItem({
      productId: product.id || product._id,
      quantity: qty,
      variantId: variantId || undefined,
    })
    if (!result.ok) setError(result.message)
  }

  async function onNotify(e) {
    e.preventDefault()
    setNotifyBusy(true)
    setNotifyMsg('')
    try {
      const res = await api.subscribeStockAlert({
        productId: product.id || product._id,
        variantId: variantId || undefined,
        email: notifyEmail,
      })
      setNotifyMsg(res.message || 'You will be notified by email')
    } catch (err) {
      setNotifyMsg(err.message)
    } finally {
      setNotifyBusy(false)
    }
  }

  if (!product && !error) return <p className="muted">Loading…</p>
  if (!product) return <p className="error">{error}</p>

  return (
    <article className="card stack" style={{ maxWidth: 640 }}>
      <Link to="/" className="muted">
        ← Back to shop
      </Link>
      <img
        src={selectedVariant?.image || product.image?.[0] || ''}
        alt=""
        style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12 }}
      />
      <h1 style={{ margin: 0 }}>{product.name}</h1>
      <p className="price">
        ${Number(selectedVariant?.price ?? product.price ?? 0).toFixed(2)}
      </p>
      <p>{product.description}</p>

      {inStock ? (
        <p className={lowStock ? 'stock-low' : 'stock-ok'}>
          {lowStock ? `Only ${stock} left` : `${stock} in stock`}
        </p>
      ) : (
        <p className="stock-out">Out of stock</p>
      )}

      {variants.length > 0 && (
        <label className="field">
          Option
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => {
              const vid = v.id || v._id
              const label = [v.size, v.color, v.sku].filter(Boolean).join(' / ') || `Variant ${vid}`
              return (
                <option key={vid} value={vid}>
                  {label} ({Number(v.stock || 0)} left)
                </option>
              )
            })}
          </select>
        </label>
      )}

      {inStock ? (
        <div className="nav-links">
          <label className="qty-field">
            Qty
            <input
              type="number"
              min={1}
              max={stock}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onAdd}>
            {busy ? 'Adding…' : 'Add to cart'}
          </button>
          <Link className="btn" to="/cart">
            View cart
          </Link>
        </div>
      ) : (
        <form className="card stack notify-box" onSubmit={onNotify}>
          <strong>Notify me when back in stock</strong>
          <p className="muted" style={{ margin: 0 }}>
            We will email you once this item is available again.
          </p>
          <label className="field">
            Email
            <input
              type="email"
              required
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={notifyBusy}>
            {notifyBusy ? 'Saving…' : 'Notify me'}
          </button>
          {notifyMsg && <p className={notifyMsg.includes('already') ? 'error' : 'muted'}>{notifyMsg}</p>}
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </article>
  )
}
