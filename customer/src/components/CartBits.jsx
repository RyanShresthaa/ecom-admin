import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'

// Cart line helpers — product may be nested from API.
export function cartProduct(item) {
  return item?.productId && typeof item.productId === 'object' ? item.productId : null
}

export function cartLineName(item) {
  const p = cartProduct(item)
  return p?.name || `Product #${item.product_id || item.productId || '?'}`
}

export function cartLinePrice(item) {
  const p = cartProduct(item)
  const variant = item.variant
  if (variant?.price != null) return Number(variant.price)
  return Number(p?.price || 0)
}

export function cartLineImage(item) {
  const p = cartProduct(item)
  return variantImage(item) || p?.image?.[0] || ''
}

function variantImage(item) {
  return item?.variant?.image || null
}

// Issue banner message for validate-cart codes.
export function issueLabel(issue) {
  if (issue.code === 'out_of_stock') return 'Out of stock — remove or wait for restock'
  if (issue.code === 'qty_reduced') return issue.message || 'Quantity exceeds stock'
  if (issue.code === 'unavailable') return 'No longer available'
  return issue.message || 'Cart issue'
}

// Small toast host for cart actions (stock errors, add success).
export function CartToast() {
  const { toast } = useCart()
  if (!toast) return null
  return <div className="toast" role="status">{toast}</div>
}

// Nav badge link to cart page.
export function CartNavLink() {
  const { count } = useCart()
  return (
    <Link to="/cart" className="btn">
      Cart{count > 0 ? ` (${count})` : ''}
    </Link>
  )
}
