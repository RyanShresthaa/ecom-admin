const TOKEN_KEY = 'orbit_admin_token'
const REFRESH_KEY = 'orbit_admin_refresh'

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super(
      'No API configured. Set NEXT_PUBLIC_API_URL in a .env file (e.g. NEXT_PUBLIC_API_URL=http://localhost:5000/api) and restart the dev server.'
    )
    this.name = 'ApiNotConfiguredError'
  }
}

export function getApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL || '/api'
  return String(url).replace(/\/$/, '')
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl())
}

export function getStoredToken(override) {
  if (override) return override
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setStoredTokens({ accessToken, refreshToken } = {}) {
  try {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
    else localStorage.removeItem(TOKEN_KEY)
    if (refreshToken !== undefined) {
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
      else localStorage.removeItem(REFRESH_KEY)
    }
  } catch {
    /* private browsing */
  }
}

export function clearStoredTokens() {
  setStoredTokens({ accessToken: null, refreshToken: null })
}

function emitAuthLogout() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orbit:auth-logout'))
  }
}

function emitAuthToken(token) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orbit:auth-token', { detail: { token } }))
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

function buildUrl(path, params) {
  const base = getApiBaseUrl()
  if (!base) throw new ApiNotConfiguredError()
  const pathname = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const url = /^https?:\/\//i.test(base)
    ? new URL(pathname)
    : new URL(pathname, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  if (params) {
    serializeParams(params).forEach((value, key) => url.searchParams.set(key, value))
  }
  return url
}

let refreshInFlight = null

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refresh = getStoredRefreshToken()
    if (!refresh) return null
    try {
      const url = buildUrl('/user/refresh-token')
      const res = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${refresh}`,
        },
      })
      if (!res.ok) {
        clearStoredTokens()
        emitAuthLogout()
        return null
      }
      const data = await res.json()
      const access = data?.data?.accesstoken
      const nextRefresh = data?.data?.refreshToken
      if (!access) {
        clearStoredTokens()
        emitAuthLogout()
        return null
      }
      setStoredTokens({ accessToken: access, refreshToken: nextRefresh || refresh })
      emitAuthToken(access)
      return access
    } catch {
      clearStoredTokens()
      emitAuthLogout()
      return null
    }
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function isAuthPath(path) {
  const p = String(path || '')
  return (
    p.includes('/user/login') ||
    p.includes('/user/refresh-token') ||
    p.includes('/user/register') ||
    p.includes('/user/forgot-password') ||
    p.includes('/user/reset-password')
  )
}

/**
 * Low-level fetch wrapper. All domain API calls go through here when
 * NEXT_PUBLIC_API_URL is set. See docs/API.md for expected route shapes.
 */
export async function request(path, options = {}) {
  const { method = 'GET', body, params, token, headers = {}, _retry = false } = options
  const base = getApiBaseUrl()
  if (!base) throw new ApiNotConfiguredError()

  const url = buildUrl(path, params)
  const authToken = getStoredToken(token)
  const init = {
    method,
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

  if (res.status === 401 && !_retry && !isAuthPath(path)) {
    const next = await refreshAccessToken()
    if (next) {
      return request(path, { ...options, token: next, _retry: true })
    }
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  let data
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  if (!res.ok) {
    if (res.status === 401 && !isAuthPath(path)) {
      clearStoredTokens()
      emitAuthLogout()
    }
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    throw new ApiError(message, { status: res.status, body: data })
  }

  return data
}

/** Try refresh during session restore when access token is expired. */
export async function ensureFreshAccessToken() {
  const access = getStoredToken()
  if (!access) {
    if (getStoredRefreshToken()) return refreshAccessToken()
    return null
  }
  // Probe with a lightweight authenticated call is expensive; just return stored
  // and let request() refresh on 401. For restore, attempt refresh if we only
  // have a refresh token.
  return access
}

export { refreshAccessToken }
