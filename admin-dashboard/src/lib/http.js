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
    if (event?.data?.type === 'refreshed') {
      setCsrfToken(event.data.csrfToken ?? readCookie('csrfToken'))
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
    url.includes('/user/login-pin')
  )
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = http
      .post('/user/refresh-token')
      .then((res) => {
        const next = res.data.data?.csrfToken ?? readCookie('csrfToken')
        setCsrfToken(next)
        broadcastRefresh(next)
        return res
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

http.interceptors.request.use((config) => {
  const token = getCsrfToken()
  if (token && !['get', 'head', 'options'].includes(config.method?.toLowerCase() ?? '')) {
    config.headers['X-CSRF-Token'] = token
  }
  // Auth relies on httpOnly cookies (withCredentials). Do not attach Bearer JWTs from storage.
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true
      try {
        await refreshSession()
        return http(original)
      } catch {
        setCsrfToken(null)
        clearLegacyTokenStorage()
      }
    }

    const message = error.response?.data?.message || error.message || 'Request failed'
    const err = new Error(message)
    err.status = status
    return Promise.reject(err)
  },
)

