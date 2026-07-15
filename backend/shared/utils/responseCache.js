/**
 * Tiny in-memory TTL cache for hot GET responses (helps Nepal → Neon US latency).
 */
const store = new Map()

export async function withCache(key, ttlMs, fn) {
  const hit = store.get(key)
  if (hit && Date.now() < hit.exp) return hit.value
  const value = await fn()
  store.set(key, { value, exp: Date.now() + ttlMs })
  return value
}

export function bustCache(prefix = '') {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (String(key).startsWith(prefix)) store.delete(key)
  }
}
