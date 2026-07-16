import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'

// Product detail page — fetches and displays a single catalog item by id.
export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')

  // Fetch product when route id changes; ignore stale responses after unmount.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.product(id)
        if (alive) setProduct(res.data)
      } catch (e) {
        if (alive) setError(e.message)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!product) return <p className="muted">Loading…</p>

  return (
    <article className="card stack" style={{ maxWidth: 640 }}>
      <Link to="/" className="muted">
        ← Back to shop
      </Link>
      <img
        src={product.image?.[0] || ''}
        alt=""
        style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12 }}
      />
      <h1 style={{ margin: 0 }}>{product.name}</h1>
      <p className="price">${Number(product.price || 0).toFixed(2)}</p>
      <p>{product.description}</p>
    </article>
  )
}
