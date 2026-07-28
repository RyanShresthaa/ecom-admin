import {
  PRODUCTS,
  ORDERS,
  INVENTORY,
  TOTAL_USERS,
  SETTINGS,
  setSettings,
  CATEGORIES,
  PROFILE,
  setProfile,
  NOTIFICATIONS,
  setNotifications,
} from './database'
import { randomInt } from './generators'

// ---------------------------------------------------------------------------
// This file stands in for a real backend. Every export below mirrors what an
// axios-based API client would look like (same shapes, same async contract),
// so swapping to a real REST/GraphQL API later only means editing this file.
// ---------------------------------------------------------------------------

const LATENCY = [350, 750]

function delay() {
  const ms = randomInt(LATENCY[0], LATENCY[1])
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applySort(rows, sorting) {
  if (!sorting || sorting.length === 0) return rows
  const { id, desc } = sorting[0]
  return [...rows].sort((a, b) => {
    const av = a[id]
    const bv = b[id]
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') {
      return desc ? bv - av : av - bv
    }
    const as = String(av).toLowerCase()
    const bs = String(bv).toLowerCase()
    if (as < bs) return desc ? 1 : -1
    if (as > bs) return desc ? -1 : 1
    return 0
  })
}

function paginate(rows, page, pageSize) {
  const start = page * pageSize
  return rows.slice(start, start + pageSize)
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function fetchDashboardStats() {
  await delay()
  const totalRevenue = ORDERS.reduce((sum, o) => sum + o.totalAmount, 0)
  const totalOrders = ORDERS.length
  const delivered = ORDERS.filter((o) => o.deliveryStatus === 'Delivered').length
  const conversionRate = Number(((delivered / totalOrders) * 100).toFixed(1))

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    revenueChange: 12.4,
    totalOrders,
    ordersChange: 8.1,
    totalUsers: TOTAL_USERS,
    usersChange: 4.6,
    conversionRate,
    conversionChange: -1.2,
  }
}

export async function fetchSalesSeries() {
  await delay()
  const days = 14
  const today = new Date()
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    series.push({
      date: label,
      revenue: randomInt(3200, 9800),
      orders: randomInt(40, 140),
    })
  }
  return series
}

export async function fetchRecentOrders({ page = 0, pageSize = 5 } = {}) {
  await delay()
  const rows = paginate(ORDERS, page, pageSize)
  return { rows, pageCount: Math.ceil(ORDERS.length / pageSize), rowCount: ORDERS.length }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function fetchProducts({ page = 0, pageSize = 10, sorting = [], search = '', category = 'all', status = 'all' } = {}) {
  await delay()
  let rows = PRODUCTS

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    )
  }
  if (category !== 'all') rows = rows.filter((p) => p.category === category)
  if (status !== 'all') rows = rows.filter((p) => p.status === status)

  rows = applySort(rows, sorting)
  const rowCount = rows.length
  const pageRows = paginate(rows, page, pageSize)

  return { rows: pageRows, pageCount: Math.max(1, Math.ceil(rowCount / pageSize)), rowCount }
}

export async function createProduct(payload) {
  await delay()
  const id = `PRD-${String(PRODUCTS.length + 1).padStart(4, '0')}`
  const product = {
    id,
    sku: payload.sku || `SKU-${randomInt(10000, 99999)}`,
    createdAt: new Date().toISOString(),
    rating: 0,
    ...payload,
  }
  PRODUCTS.unshift(product)
  return product
}

export async function updateProduct(id, payload) {
  await delay()
  const idx = PRODUCTS.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Product not found')
  PRODUCTS[idx] = { ...PRODUCTS[idx], ...payload }
  return PRODUCTS[idx]
}

export async function deleteProduct(id) {
  await delay()
  const idx = PRODUCTS.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Product not found')
  const [removed] = PRODUCTS.splice(idx, 1)
  return removed
}

export function getCategories() {
  return CATEGORIES
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function fetchOrders({
  page = 0,
  pageSize = 10,
  sorting = [],
  search = '',
  deliveryStatus = 'all',
  paymentStatus = 'all',
  dateFrom = null,
  dateTo = null,
} = {}) {
  await delay()
  let rows = ORDERS

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((o) => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
  }
  if (deliveryStatus !== 'all') rows = rows.filter((o) => o.deliveryStatus === deliveryStatus)
  if (paymentStatus !== 'all') rows = rows.filter((o) => o.paymentStatus === paymentStatus)
  if (dateFrom) rows = rows.filter((o) => new Date(o.date) >= new Date(dateFrom))
  if (dateTo) rows = rows.filter((o) => new Date(o.date) <= new Date(dateTo))

  rows = applySort(rows, sorting)
  const rowCount = rows.length
  const pageRows = paginate(rows, page, pageSize)

  return { rows: pageRows, pageCount: Math.max(1, Math.ceil(rowCount / pageSize)), rowCount }
}

export async function fetchOrderById(id) {
  await delay()
  const order = ORDERS.find((o) => o.id === id)
  if (!order) throw new Error('Order not found')
  return order
}

export async function updateOrderStatus(id, { deliveryStatus, paymentStatus }) {
  await delay()
  const idx = ORDERS.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error('Order not found')
  ORDERS[idx] = {
    ...ORDERS[idx],
    ...(deliveryStatus ? { deliveryStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
  }
  return ORDERS[idx]
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function fetchInventory({
  page = 0,
  pageSize = 10,
  sorting = [],
  search = '',
  warehouse = 'all',
  stockLevel = 'all',
} = {}) {
  await delay()
  let rows = INVENTORY

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
  }
  if (warehouse !== 'all') rows = rows.filter((i) => i.warehouse === warehouse)
  if (stockLevel === 'low') rows = rows.filter((i) => i.lowStock)
  if (stockLevel === 'ok') rows = rows.filter((i) => !i.lowStock)

  rows = applySort(rows, sorting)
  const rowCount = rows.length
  const pageRows = paginate(rows, page, pageSize)

  return { rows: pageRows, pageCount: Math.max(1, Math.ceil(rowCount / pageSize)), rowCount }
}

export function getWarehouses() {
  return [...new Set(INVENTORY.map((i) => i.warehouse))]
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchSettings() {
  await delay()
  return SETTINGS
}

export async function saveSettings(payload) {
  await delay()
  return setSettings({ ...SETTINGS, ...payload })
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile() {
  await delay()
  return PROFILE
}

export async function updateProfile(payload) {
  await delay()
  return setProfile({ ...PROFILE, ...payload })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications() {
  await delay()
  return [...NOTIFICATIONS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function markNotificationRead(id) {
  await delay()
  setNotifications(
    NOTIFICATIONS.map((n) => (n.id === id ? { ...n, read: true } : n))
  )
  return NOTIFICATIONS.find((n) => n.id === id)
}

export async function markAllNotificationsRead() {
  await delay()
  setNotifications(NOTIFICATIONS.map((n) => ({ ...n, read: true })))
  return NOTIFICATIONS
}

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------

export async function globalSearch({ q = '', limit = 5 } = {}) {
  await delay()
  const query = q.trim().toLowerCase()
  if (query.length < 2) {
    return { products: [], orders: [], customers: [] }
  }

  const products = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
  )
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.sku,
      href: `/products?q=${encodeURIComponent(p.name)}`,
    }))

  const orders = ORDERS.filter(
    (o) => o.id.toLowerCase().includes(query) || o.customerName.toLowerCase().includes(query)
  )
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      label: o.id,
      sublabel: `${o.customerName} · ${o.deliveryStatus}`,
      href: `/orders?q=${encodeURIComponent(o.id)}`,
    }))

  const seenCustomers = new Set()
  const customers = []
  for (const order of ORDERS) {
    if (customers.length >= limit) break
    const name = order.customerName
    if (!name.toLowerCase().includes(query)) continue
    if (seenCustomers.has(name)) continue
    seenCustomers.add(name)
    customers.push({
      id: name,
      label: name,
      sublabel: order.customerEmail,
      href: `/orders?q=${encodeURIComponent(name)}`,
    })
  }

  return { products, orders, customers }
}
