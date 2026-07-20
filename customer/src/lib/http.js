/** Customer session token — never reuse admin localStorage key */
export const CUSTOMER_TOKEN_KEY = 'orbit_customer_token'
export const GUEST_ID_KEY = 'orbit_guest_id'

// Resolve API base URL from Vite env, defaulting to same-origin /api proxy.
export function getApiBase() {
  return String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
}

// Guest cart id — persist so anonymous baskets survive reloads.
export function getGuestId() {
  try {
    return localStorage.getItem(GUEST_ID_KEY)
  } catch {
    return null
  }
}

export function setGuestId(id) {
  if (!id) return
  try {
    localStorage.setItem(GUEST_ID_KEY, id)
  } catch {
    /* ignore */
  }
}

// Low-level fetch wrapper — Bearer + guest cart headers.
export async function request(path, { method = 'GET', body, token } = {}) {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const auth = token ?? localStorage.getItem(CUSTOMER_TOKEN_KEY)
  const guestId = getGuestId()

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(guestId ? { 'X-Guest-Id': guestId } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  const returnedGuest = data.guestId || res.headers.get('X-Guest-Id')
  if (returnedGuest) setGuestId(returnedGuest)

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }
  return data
}
