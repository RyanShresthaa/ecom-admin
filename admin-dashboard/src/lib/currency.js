/**
 * NPR ↔ USD helpers for the admin dashboard.
 * Catalog / product prices are always stored in NPR.
 * Display currency follows region: US → USD, Nepal → NPR.
 */

export const DEFAULT_USD_NPR_RATE = 133

export function normalizeUsdNprRate(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_USD_NPR_RATE
  return n
}

export function normalizeCurrencyCode(code, fallback = 'USD') {
  const c = String(code || fallback).trim().toUpperCase()
  if (c === 'NPR' || c === 'NRS' || c === 'RS') return 'NPR'
  if (c === 'USD' || c === 'US$') return 'USD'
  return c || fallback
}

/**
 * Convert between USD and NPR.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @param {number} [usdNprRate]
 */
export function convertCurrency(amount, from, to, usdNprRate = DEFAULT_USD_NPR_RATE) {
  const value = Number(amount) || 0
  const src = normalizeCurrencyCode(from)
  const dest = normalizeCurrencyCode(to)
  if (src === dest) return Number(value.toFixed(2))

  const rate = normalizeUsdNprRate(usdNprRate)
  let inUsd = value
  if (src === 'NPR') inUsd = value / rate
  else if (src !== 'USD') return Number(value.toFixed(2))

  let out = inUsd
  if (dest === 'NPR') out = inUsd * rate
  else if (dest !== 'USD') return Number(value.toFixed(2))

  return Number(out.toFixed(2))
}

/**
 * Catalog amount (NPR) → shop display amount for the active region.
 * Accepts camelCase (admin) or snake_case (API) option bags.
 */
export function toDisplayAmount(baseAmount, opts = {}) {
  const regionMode = String(opts.regionMode || opts.region_mode || 'us').toLowerCase()
  const rate = normalizeUsdNprRate(opts.usdNprRate ?? opts.usd_npr_rate)
  const value = Number(baseAmount) || 0

  // Always treat catalog prices as NPR; US region shows USD.
  if (regionMode === 'nepal') return Number(value.toFixed(2))
  return Number((value / rate).toFixed(2))
}

/**
 * Display amount → catalog NPR for persistence.
 */
export function toBaseAmount(displayAmount, opts = {}) {
  const regionMode = String(opts.regionMode || opts.region_mode || 'us').toLowerCase()
  const rate = normalizeUsdNprRate(opts.usdNprRate ?? opts.usd_npr_rate)
  const value = Number(displayAmount) || 0

  if (regionMode === 'nepal') return Number(value.toFixed(2))
  return Number((value * rate).toFixed(2))
}
