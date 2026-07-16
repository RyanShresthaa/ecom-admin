/**
 * Normalize payment method labels for admin UI.
 * Stored in orders.payment_id for admin-created orders (COD, CARD, CASH, BANK).
 * Online checkout often uses Stripe payment ids (pi_…) or COD in payment_status.
 */
export const PAYMENT_METHODS = [
  { value: 'COD', label: 'Cash on delivery' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank transfer' },
]

// Payment helper: infers normalized payment method from payment id/status fields.
export function derivePaymentMethod(paymentId, paymentStatus) {
  const id = String(paymentId || '').trim()
  const status = String(paymentStatus || '').trim()

  if (/cash\s*on\s*delivery|^cod$/i.test(status) || /^cod$/i.test(id)) return 'COD'
  if (/^card$/i.test(id) || /^pi_/i.test(id) || /stripe/i.test(id)) return 'CARD'
  if (/^cash$/i.test(id)) return 'CASH'
  if (/^bank/i.test(id)) return 'BANK'
  if (id && id !== 'ADMIN') return 'CARD'
  if (/unpaid/i.test(status)) return 'COD'
  if (id === 'ADMIN' || /paid/i.test(status)) return 'CASH'
  return '—'
}

// Payment helper: maps normalized method code to UI-friendly label.
export function paymentMethodLabel(method) {
  const key = String(method || '').toUpperCase()
  return PAYMENT_METHODS.find((m) => m.value === key)?.label || method || '—'
}
