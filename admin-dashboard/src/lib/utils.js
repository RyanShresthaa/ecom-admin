import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names safely, resolving conflicts (last one wins).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Updated by LocaleProvider from shop settings (US / Nepal). */
let localeConfig = {
  currency: 'USD',
  timezone: 'America/New_York',
  regionMode: 'us',
}

export function setLocaleConfig(next = {}) {
  localeConfig = {
    currency: next.currency || 'USD',
    timezone: next.timezone || 'America/New_York',
    regionMode: next.regionMode === 'nepal' ? 'nepal' : 'us',
  }
}

export function getLocaleConfig() {
  return localeConfig
}

/**
 * Format a number as currency (shop settings currency by default).
 */
export function formatCurrency(value, currency = localeConfig.currency) {
  const code = String(currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(code === 'NPR' ? 'en-NP' : 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0)
  } catch {
    return `${code} ${(Number(value) || 0).toFixed(2)}`
  }
}

/**
 * Format a plain number with thousands separators.
 */
export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a date string into a short, readable form (shop timezone by default).
 */
export function formatDate(date, timeZone = localeConfig.timezone) {
  const opts = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
  if (timeZone) opts.timeZone = timeZone
  try {
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(date))
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }
}

/**
 * Build initials from a full name, e.g. "Jane Doe" -> "JD".
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
