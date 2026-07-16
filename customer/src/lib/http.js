/** Customer session token — never reuse admin localStorage key */
export const CUSTOMER_TOKEN_KEY = 'orbit_customer_token'

// Resolve API base URL from Vite env, defaulting to same-origin /api proxy.
export function getApiBase() {
  return String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
}

// Low-level fetch wrapper — attaches Bearer token and normalizes JSON errors.
export async function request(path, { method = 'GET', body, token } = {}) {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const auth = token ?? localStorage.getItem(CUSTOMER_TOKEN_KEY)

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }
  return data
}
