/**
 * Persist which admin notifications have been marked read.
 * Notifications are derived from live orders/inventory, so read state
 * must live client-side (localStorage) across refetches.
 */

const STORAGE_KEY = 'admin-notification-reads'

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ids: [], allBefore: null }
    const parsed = JSON.parse(raw)
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.map(String) : [],
      allBefore: typeof parsed.allBefore === 'number' ? parsed.allBefore : null,
    }
  } catch {
    return { ids: [], allBefore: null }
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ids: [...new Set(store.ids.map(String))],
        allBefore: store.allBefore,
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function isNotificationRead(notification) {
  const store = readStore()
  const id = String(notification.id)
  if (store.ids.includes(id)) return true
  if (store.allBefore != null) {
    const created = new Date(notification.createdAt).getTime()
    if (Number.isFinite(created) && created <= store.allBefore) return true
  }
  return Boolean(notification.read)
}

export function applyNotificationReadState(notifications) {
  return (notifications || []).map((n) => ({
    ...n,
    read: isNotificationRead(n),
  }))
}

export function markNotificationRead(id) {
  const store = readStore()
  store.ids.push(String(id))
  writeStore(store)
  return { id, read: true }
}

export function markAllNotificationsRead(notifications = []) {
  const store = readStore()
  const now = Date.now()
  store.allBefore = now
  for (const n of notifications) {
    store.ids.push(String(n.id))
  }
  writeStore(store)
  return applyNotificationReadState(
    notifications.map((n) => ({ ...n, createdAt: n.createdAt || new Date(now).toISOString() })),
  )
}
