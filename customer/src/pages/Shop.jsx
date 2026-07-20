import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

// Shop home — product grid with stock status badges.
export default function Shop() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.products({ published: 'true' })
        if (alive) setItems(res.data || [])
      } catch (e) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <p className="muted">Loading products…</p>
  if (error) {
    return (
      <div className="card stack">
        <p className="error">{error}</p>
        <p className="muted">
          Start the shared API: <code>npm run dev:api</code> (port 5000).
        </p>
      </div>
    )
  }

  return (
    <section className="stack">
      <div>
        <h1 style={{ margin: 0 }}>Shop</h1>
        <p className="muted">Published products — stock availability shown on each card.</p>
      </div>
      {items.length === 0 ? (
        <div className="card muted">No products yet. Publish some from Admin → Live store.</div>
      ) : (
        <div className="grid">
          {items.map((p) => {
            const stock = Number(p.stock || 0)
            const inStock = stock > 0
            return (
              <Link
                key={p.id || p._id}
                to={`/product/${p.id || p._id}`}
                className="card product-card stack"
              >
                <img src={p.image?.[0] || p.images?.[0] || ''} alt="" />
                <strong>{p.name}</strong>
                <span className="price">${Number(p.price || 0).toFixed(2)}</span>
                <span className={inStock ? (stock <= 5 ? 'stock-low' : 'stock-ok') : 'stock-out'}>
                  {inStock ? (stock <= 5 ? `Only ${stock} left` : 'In stock') : 'Out of stock'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
