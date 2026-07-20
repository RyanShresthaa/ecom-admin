import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names safely, resolving conflicts (last one wins).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency (USD by default).
 */
export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a plain number with thousands separators.
 */
export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a date string into a short, readable form.
 */
export function formatDate(date) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

/**
 * Format a date string with both date and time.
 */
export function formatDateTime(date) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
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

/**
 * Format a date into relative time, e.g. "3 hours ago".
 */
export function formatRelativeTime(date) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return formatDistanceToNow(parsed, { addSuffix: true })
}
