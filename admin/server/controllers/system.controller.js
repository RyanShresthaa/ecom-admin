import { getDb, saveDb, updateDb } from '../db.js'
import { syncInventoryLowStock, toPublicUser } from '../utils.js'

// Settings page: reads current application settings.
export async function getSettings(_req, res) {
  res.json(getDb().settings)
}

// Settings page: updates settings and recalculates low-stock flags.
export async function updateSettings(req, res) {
  let settings = null
  await updateDb((db) => {
    db.settings = { ...db.settings, ...req.body }
    syncInventoryLowStock(db)
    settings = db.settings
  })
  res.json(settings)
}

// Topbar global search: returns quick matches across customers/products/orders.
export async function search(req, res) {
  const db = getDb()
  const q = String(req.query.q || '').toLowerCase()
  const limit = Number(req.query.limit) || 5
  if (!q) return res.json({ customers: [], products: [], orders: [] })

  const customers = db.customers
    .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    .slice(0, limit)
    .map((c) => ({ id: c.id, name: c.name, email: c.email }))

  const products = db.products
    .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    .slice(0, limit)
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price }))

  const orders = db.orders
    .filter((o) => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
    .slice(0, limit)
    .map((o) => ({ id: o.id, customerName: o.customerName, totalAmount: o.totalAmount }))

  res.json({ customers, products, orders })
}

// Notifications panel: returns unread/read notifications list.
export async function listNotifications(_req, res) {
  res.json(getDb().notifications)
}

// Notifications panel: marks a single notification as read.
export async function markNotificationRead(req, res) {
  let updated = null
  await updateDb((db) => {
    const n = db.notifications.find((x) => x.id === req.params.id)
    if (!n) return
    n.read = true
    updated = n
  })
  if (!updated) return res.status(404).json({ message: 'Notification not found' })
  res.json(updated)
}

// Notifications panel: marks all notifications as read.
export async function markAllNotificationsRead(_req, res) {
  await updateDb((db) => {
    for (const n of db.notifications) n.read = true
  })
  res.json({ success: true })
}

// Account page: returns current authenticated user profile.
export async function getAccount(req, res) {
  res.json(req.user)
}

// Account page: updates display name/email for authenticated user.
export async function patchAccount(req, res) {
  let updated = null
  await updateDb((db) => {
    const idx = db.users.findIndex((u) => u.id === req.user.id)
    if (idx === -1) return
    db.users[idx] = { ...db.users[idx], name: req.body.name ?? db.users[idx].name, email: req.body.email ?? db.users[idx].email }
    updated = toPublicUser(db.users[idx])
  })
  res.json(updated)
}

// Account security page: changes password after current-password verification.
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {}
  const db = getDb()
  const user = db.users.find((u) => u.id === req.user.id)
  if (!user || user.password !== currentPassword) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }
  user.password = newPassword
  await saveDb()
  res.json({ success: true })
}

