const TOKEN_KEY = 'orbit_admin_token'

// HTTP error type: preserves status and parsed response body.
export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// Config error type: thrown when API base URL is unavailable.
export class ApiNotConfiguredError extends Error {
  constructor() {
    super(
      'No API configured. Set VITE_API_URL in a .env file (e.g. VITE_API_URL=/api) and restart the dev server.'
    )
    this.name = 'ApiNotConfiguredError'
  }
}

// URL helper: detects localhost/loopback API URLs.
function isLoopbackApiUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(String(url || ''))
}

// Runtime helper: true when app runs on non-local/public host.
function isBrowserOnPublicHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return Boolean(host) && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]'
}

/**
 * Resolve API base. On a public host (e.g. Vercel), never call localhost —
 * browsers block Private Network Access from HTTPS → loopback.
 */
export function getApiBaseUrl() {
  const configured = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  if (isBrowserOnPublicHost() && isLoopbackApiUrl(configured)) {
    return '/api'
  }
  return configured || '/api'
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl())
}

// Token helper: resolves auth token from override or localStorage.
export function getStoredToken(override) {
  if (override) return override
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Flatten list-query params for query strings (sorting → JSON). */
export function serializeParams(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (key === 'sorting' && Array.isArray(value)) {
      if (value.length > 0) search.set('sorting', JSON.stringify(value))
      return
    }
    search.set(key, String(value))
  })
  return search
}

/**
 * Low-level fetch wrapper. All domain API calls go through here when
 * VITE_API_URL is set. See docs/API.md for expected route shapes.
 */
export async function request(path, { method = 'GET', body, params, token, headers = {} } = {}) {
  const base = getApiBaseUrl()
  if (!base) throw new ApiNotConfiguredError()

  const pathname = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const url = /^https?:\/\//i.test(base)
    ? new URL(pathname)
    : new URL(pathname, window.location.origin)
  if (params) {
    serializeParams(params).forEach((value, key) => url.searchParams.set(key, value))
  }

  const authToken = getStoredToken(token)
  const init = {
    method,
    // Bearer-only against shared API — avoids cross-origin CSRF cookie pairing
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...headers,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  }

  if (body != null && method !== 'GET' && method !== 'HEAD') {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const res = await fetch(url.toString(), init)

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  let data
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    throw new ApiError(message, { status: res.status, body: data })
  }

  return data
}

/** Multipart upload (e.g. images). Do not set Content-Type — browser adds boundary. */
export async function uploadFormData(path, formData, { token, method = 'POST' } = {}) {
  const base = getApiBaseUrl()
  if (!base) throw new ApiNotConfiguredError()

  const pathname = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const url = /^https?:\/\//i.test(base)
    ? new URL(pathname)
    : new URL(pathname, window.location.origin)

  const authToken = getStoredToken(token)
  const res = await fetch(url.toString(), {
    method,
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: formData,
  })

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `Upload failed (${res.status})`
    throw new ApiError(message, { status: res.status, body: data })
  }

  return data
}
