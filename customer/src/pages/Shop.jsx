import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

// Shop home page — grid of published products from shared catalog API.
export default function Shop() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load published products on mount; cancel updates if unmounted.
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
        <p className="muted">Start the shared API: <code>npm run dev:api</code> (port 5000).</p>
      </div>
    )
  }

  return (
    <section className="stack">
      <div>
        <h1 style={{ margin: 0 }}>Shop</h1>
        <p className="muted">Published products from the shared database.</p>
      </div>
      {items.length === 0 ? (
        <div className="card muted">No products yet. Publish some from Admin → Live store.</div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <Link key={p.id || p._id} to={`/product/${p.id || p._id}`} className="card product-card stack">
              <img src={p.image?.[0] || p.images?.[0] || ''} alt="" />
              <strong>{p.name}</strong>
              <span className="price">${Number(p.price || 0).toFixed(2)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
