import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import {
  cartLineImage,
  cartLineName,
  cartLinePrice,
  issueLabel,
} from '@/components/CartBits'

// Cart page — list lines, update qty with stock errors, validate / autofix.
export default function Cart() {
  const { items, issues, loading, busy, updateQty, removeItem, fixStockIssues, validate } =
    useCart()

  if (loading) return <p className="muted">Loading cart…</p>

  const issueById = new Map((issues || []).map((i) => [String(i.cartItemId), i]))
  const subtotal = items.reduce(
    (sum, item) => sum + cartLinePrice(item) * Number(item.quantity || 0),
    0
  )

  return (
    <section className="stack">
      <div className="row-between">
        <div>
          <h1 style={{ margin: 0 }}>Your cart</h1>
          <p className="muted">We check stock when you open this page and when you change quantities.</p>
        </div>
        <div className="nav-links">
          <button type="button" className="btn" disabled={busy || !items.length} onClick={() => validate(false)}>
            Re-check stock
          </button>
          {issues.length > 0 && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={fixStockIssues}>
              Fix stock issues
            </button>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="card alert-warn stack">
          <strong>Stock availability changed</strong>
          <ul className="issue-list">
            {issues.map((issue) => (
              <li key={`${issue.cartItemId}-${issue.code}`}>{issueLabel(issue)}</li>
            ))}
          </ul>
          <p className="muted" style={{ margin: 0 }}>
            Use <em>Fix stock issues</em> to drop unavailable items and cap quantities to what is left.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card muted">
          Your cart is empty. <Link to="/">Browse the shop</Link>.
        </div>
      ) : (
        <div className="stack">
          {items.map((item) => {
            const issue = issueById.get(String(item.id))
            return (
              <article key={item.id} className={`card cart-line ${issue ? 'has-issue' : ''}`}>
                <img src={cartLineImage(item)} alt="" className="cart-thumb" />
                <div className="stack" style={{ flex: 1 }}>
                  <Link to={`/product/${item.product_id || cartProductId(item)}`}>
                    <strong>{cartLineName(item)}</strong>
                  </Link>
                  <span className="price">${cartLinePrice(item).toFixed(2)}</span>
                  {issue && <p className="error">{issueLabel(issue)}</p>}
                  <div className="nav-links">
                    <label className="qty-field">
                      Qty
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        disabled={busy}
                        onChange={(e) => updateQty(item.id, Number(e.target.value) || 1)}
                      />
                    </label>
                    <button type="button" className="btn" disabled={busy} onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                <strong className="price">
                  ${(cartLinePrice(item) * Number(item.quantity || 0)).toFixed(2)}
                </strong>
              </article>
            )
          })}
          <div className="card row-between">
            <span className="muted">Subtotal</span>
            <strong className="price">${subtotal.toFixed(2)}</strong>
          </div>
          <p className="muted">Checkout is handled at the order API — cart stocking is ready here.</p>
        </div>
      )}
    </section>
  )
}

function cartProductId(item) {
  const p = item?.productId
  if (p && typeof p === 'object') return p.id || p._id
  return item.product_id || p
}
