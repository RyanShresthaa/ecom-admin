/**
 * Calls the shared ecom backend (same DB as customer).
 * Separate token from demo admin auth (`orbit_admin_token`).
 */
/** Same session as the rest of the admin app */
export const SHARED_TOKEN_KEY = 'orbit_admin_token'

export function getSharedApiBase() {
  return String(import.meta.env.VITE_SHARED_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
}

export async function sharedRequest(path, { method = 'GET', body, token } = {}) {
  const base = getSharedApiBase()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const auth = token ?? localStorage.getItem(SHARED_TOKEN_KEY)

  const res = await fetch(url, {
    method,
    // Bearer-only — avoid CSRF cookie pairing across origins
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Shared API failed (${res.status})`)
  }
  return data
}

export const sharedApi = {
  health: () => sharedRequest('/health'),
  login: (email, password) =>
    sharedRequest('/user/login', { method: 'POST', body: { email, password } }),
  me: () => sharedRequest('/user/user-details'),
  products: (params = {}) => {
    const q = new URLSearchParams({ page: '1', limit: '50', ...params })
    return sharedRequest(`/product/get-product?${q}`)
  },
  updateProduct: (payload) =>
    sharedRequest('/product/update-product', { method: 'PUT', body: payload }),
}
