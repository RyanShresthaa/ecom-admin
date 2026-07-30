import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

/** Legacy key — cleared on load so old JWTs are never reused from sessionStorage */
const LEGACY_ACCESS_KEY = 'admin-access-token'
const REFRESH_CHANNEL = 'admin-auth-refresh'

function clearLegacyTokenStorage() {
  try {
    const ss = globalThis.sessionStorage
    const ls = globalThis.localStorage
    if (ss) ss.removeItem(LEGACY_ACCESS_KEY)
    if (ls) ls.removeItem(LEGACY_ACCESS_KEY)
  } catch {
    /* ignore */
  }
}

clearLegacyTokenStorage()

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

let csrfToken = readCookie('csrfToken')
let refreshPromise = null
let csrfFetchPromise = null

const SAFE_METHODS = new Set(['get', 'head', 'options'])

function broadcastRefresh(csrf) {
  try {
    const bc = new BroadcastChannel(REFRESH_CHANNEL)
    bc.postMessage({ type: 'refreshed', csrfToken: csrf ?? null })
    bc.close()
  } catch {
    /* BroadcastChannel unsupported */
  }
}

try {
  const bc = new BroadcastChannel(REFRESH_CHANNEL)
  bc.onmessage = (event) => {
    if (event?.data?.type === 'refreshed' && event.data.csrfToken) {
      setCsrfToken(event.data.csrfToken)
    }
  }
} catch {
  /* ignore */
}

export function setCsrfToken(token) {
  csrfToken = token ?? null
}

export function getCsrfToken() {
  return csrfToken ?? readCookie('csrfToken')
}

/** @deprecated Cookie-only auth — no client JWT storage */
export function setAccessToken(_token) {
  clearLegacyTokenStorage()
}

/** @deprecated Cookie-only auth */
export function getAccessToken() {
  return null
}

function isAuthEndpoint(url = '') {
  return (
    url.includes('/user/login') ||
    url.includes('/user/refresh-token') ||
    url.includes('/user/logout') ||
    url.includes('/user/google') ||
    url.includes('/user/login-pin') ||
    url.includes('/user/csrf') ||
    url.includes('/user/2fa/')
  )
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = http
      .post('/user/refresh-token')
      .then((res) => {
        const next = res.data.data?.csrfToken
        if (next) {
          setCsrfToken(next)
          broadcastRefresh(next)
        }
        return res
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Fetch CSRF from API body — cookie is not readable cross-origin. */
export async function fetchCsrfToken() {
  if (!csrfFetchPromise) {
    csrfFetchPromise = http
      .get('/user/csrf')
      .then((res) => {
        const token = res.data.data?.csrfToken
        if (token) setCsrfToken(token)
        return token ?? null
      })
      .catch(() => null)
      .finally(() => {
        csrfFetchPromise = null
      })
  }
  return csrfFetchPromise
}

function isCsrfEndpoint(url = '') {
  return url.includes('/user/csrf')
}

function isCsrfForbidden(error) {
  return (
    error.response?.status === 403 &&
    String(error.response?.data?.message || '')
      .toLowerCase()
      .includes('csrf')
  )
}

http.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase() ?? ''
  const url = config.url || ''
  // Don't bootstrap CSRF before auth endpoints — login/refresh skip CSRF server-side
  if (!SAFE_METHODS.has(method) && !isAuthEndpoint(url) && !isCsrfEndpoint(url)) {
    if (!getCsrfToken()) {
      await fetchCsrfToken()
    }
    const token = getCsrfToken()
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url) &&
      !isCsrfEndpoint(original.url)
    ) {
      original._retry = true
      try {
        await refreshSession()
        return http(original)
      } catch {
        setCsrfToken(null)
        clearLegacyTokenStorage()
      }
    }

    if (isCsrfForbidden(error) && original && !original._csrfRetry) {
      original._csrfRetry = true
      try {
        await fetchCsrfToken()
        const token = getCsrfToken()
        if (token) original.headers['X-CSRF-Token'] = token
        return http(original)
      } catch {
        setCsrfToken(null)
      }
    }

    const message = error.response?.data?.message || error.message || 'Request failed'
    const err = new Error(message)
    err.status = status
    return Promise.reject(err)
  },
)

