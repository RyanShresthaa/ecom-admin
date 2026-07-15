/**
 * Admin UI → shared backend (`backend/`) adapter.
 * Keeps the dashboard's expected shapes while calling Postgres API routes.
 */
import { request } from '@/lib/http'
import { ADJUSTMENT_REASONS } from '@/lib/constants'

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/png'

function mapRole(backendRole) {
  if (backendRole === 'Admin') return 'admin'
  if (backendRole === 'Seller') return 'editor'
  return null
}

function mapUser(u) {
  if (!u) return null
  const id = u.id ?? u._id
  return {
    id: String(id),
    name: u.name || u.email,
    email: u.email,
    role: mapRole(u.role) || 'viewer',
    backendRole: u.role,
    avatar: u.avatar || null,
    status: u.status === 'Active' ? 'active' : 'inactive',
    phone: u.mobile || u.phone || '',
    createdAt: u.created_at || u.createdAt,
  }
}

function mapProduct(p) {
  if (!p) return null
  const id = p.id ?? p._id
  const categoryName =
    (Array.isArray(p.category) && (p.category[0]?.name || p.category[0])) ||
    p.category_name ||
    'Uncategorized'
  return {
    id: String(id),
    name: p.name,
    category: typeof categoryName === 'string' ? categoryName : 'Uncategorized',
    price: Number(p.price || 0),
    stock: Number(p.stock ?? 0),
    sku: p.sku || `SKU-${id}`,
    status: p.publish === false ? 'inactive' : 'active',
    image: Array.isArray(p.image) ? p.image[0] || null : p.image || null,
    description: p.description || '',
    unit: p.unit || 'pc',
    publish: p.publish !== false,
    lowStockThreshold: p.low_stock_threshold ?? 5,
    createdAt: p.created_at || p.createdAt,
    updatedAt: p.updated_at || p.updatedAt,
    _raw: p,
  }
}

function paginate(rows, params = {}) {
  const page = Number(params.page) || 0
  const pageSize = Number(params.pageSize) || 10
  let list = [...rows]

  const search = String(params.search || '').trim().toLowerCase()
  if (search) {
    list = list.filter(
      (r) =>
        String(r.name || '').toLowerCase().includes(search) ||
        String(r.email || '').toLowerCase().includes(search) ||
        String(r.sku || '').toLowerCase().includes(search) ||
        String(r.id || '').toLowerCase().includes(search)
    )
  }
  if (params.category && params.category !== 'all') {
    list = list.filter((r) => r.category === params.category)
  }
  if (params.status && params.status !== 'all') {
    list = list.filter((r) => r.status === params.status)
  }

  const sorting = Array.isArray(params.sorting) ? params.sorting : []
  if (sorting[0]?.id) {
    const { id, desc } = sorting[0]
    list.sort((a, b) => {
      const av = a[id]
      const bv = b[id]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv
      return desc
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv))
    })
  }

  const rowCount = list.length
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize) || 1)
  const start = page * pageSize
  return {
    rows: list.slice(start, start + pageSize),
    pageCount,
    rowCount,
  }
}

function groupOrders(lines, usersById = {}) {
  const groups = new Map()
  for (const line of lines || []) {
    const key = line.orderId || line.order_id || String(line.id)
    if (!groups.has(key)) {
      const user = usersById[line.userId || line.user_id] || {}
      groups.set(key, {
        id: key,
        lineIds: [],
        customerId: String(line.userId || line.user_id || ''),
        customerName: user.name || user.email || `User ${line.userId || ''}`.trim(),
        customerEmail: user.email || '',
        deliveryStatus: line.delivery_status || line.deliveryStatus || 'Pending',
        paymentStatus: line.payment_status || line.paymentStatus || '',
        totalAmount: Number(line.totalAmt || line.total_amt || 0),
        date: line.created_at || line.createdAt,
        items: [],
        notes: [],
        _lines: [],
      })
    }
    const g = groups.get(key)
    g.lineIds.push(line.id ?? line._id)
    g._lines.push(line)
    g.items.push({
      id: String(line.id ?? line._id),
      productId: String(line.productId || line.product_id || ''),
      name: line.product_details?.name || line.product_details?.title || 'Item',
      quantity: Number(line.quantity || line.product_details?.quantity || 1),
      price: Number(line.unitPrice || line.unit_price || line.product_details?.price || 0),
    })
    g.totalAmount = Math.max(g.totalAmount, Number(line.totalAmt || line.total_amt || 0))
    g.deliveryStatus = line.delivery_status || g.deliveryStatus
    g.paymentStatus = line.payment_status || g.paymentStatus
  }
  return [...groups.values()]
    .map((g) => {
      // Keep Returned ↔ Refunded visible even for older rows
      if (/^returned$/i.test(g.deliveryStatus) && !/^refunded$/i.test(g.paymentStatus)) {
        g.paymentStatus = 'Refunded'
      }
      if (/^refunded$/i.test(g.paymentStatus) && !/^returned$/i.test(g.deliveryStatus)) {
        g.deliveryStatus = 'Returned'
      }
      return g
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

async function ensureCatalogIds(categoryName) {
  const cats = await request('/category/get-category')
  let cat = (cats.data || []).find(
    (c) => String(c.name).toLowerCase() === String(categoryName || '').toLowerCase()
  )
  if (!cat) {
    const created = await request('/category/add-category', {
      method: 'POST',
      body: { name: categoryName || 'General', image: PLACEHOLDER_IMAGE },
    })
    cat = created.data
  }
  const catId = cat.id ?? cat._id

  const subs = await request('/subcategory/get-subcategory')
  let sub = (subs.data || []).find((s) => {
    const ids = (s.category || []).map((c) => c.id ?? c._id ?? c)
    return ids.map(String).includes(String(catId))
  })
  if (!sub) {
    const created = await request('/subcategory/add-subcategory', {
      method: 'POST',
      body: {
        name: 'General',
        image: PLACEHOLDER_IMAGE,
        category: [catId],
      },
    })
    sub = created.data
  }
  return { catId, subId: sub.id ?? sub._id }
}

let usersMapCache = { at: 0, map: null }
let productsPageCache = { key: '', at: 0, rows: null, totalCount: 0 }
let allProductsCache = { at: 0, search: '', rows: null }
let settingsCache = { at: 0, data: null }
let warehousesCache = { at: 0, rows: null }

function bustProductCaches() {
  allProductsCache = { at: 0, search: '', rows: null }
  productsPageCache = { key: '', at: 0, rows: null, totalCount: 0 }
}

async function fetchSettingsCached() {
  if (settingsCache.data && Date.now() - settingsCache.at < 15_000) {
    return settingsCache.data
  }
  // Public map is one round-trip and includes DB defaults
  const res = await request('/shop/settings')
  const map = res.data || {}
  const taxRules = Array.isArray(map.tax_rules)
    ? map.tax_rules
    : Array.isArray(map.taxRules)
      ? map.taxRules
      : []
  const data = {
    storeName: map.store_name || map.storeName || map.company_legal_name || 'Matina Crafts',
    currency: map.currency || 'USD',
    region: map.region || map.tax_region || '',
    timezone: map.timezone || 'UTC',
    lowStockThreshold: Number(map.low_stock_threshold ?? map.lowStockThreshold ?? 5),
    taxRules,
  }
  settingsCache = { at: Date.now(), data }
  return data
}

async function fetchWarehousesCached() {
  if (warehousesCache.rows && Date.now() - warehousesCache.at < 60_000) {
    return warehousesCache.rows
  }
  try {
    const w = await request('/inventory/warehouses')
    const rows = (w.data || []).map((x) => ({
      id: String(x.id ?? x._id),
      name: x.name,
    }))
    warehousesCache = { at: Date.now(), rows: rows.length ? rows : [{ id: '1', name: 'Main Warehouse' }] }
  } catch {
    warehousesCache = { at: Date.now(), rows: [{ id: '1', name: 'Main Warehouse' }] }
  }
  return warehousesCache.rows
}

function resolveThreshold(product, settingsThreshold) {
  const pThr = Number(product.lowStockThreshold)
  // Prefer product-specific when set above default placeholder; else store setting
  if (Number.isFinite(pThr) && pThr > 0 && pThr !== 5) return pThr
  const sThr = Number(settingsThreshold)
  if (Number.isFinite(sThr) && sThr > 0) return sThr
  return Number.isFinite(pThr) && pThr > 0 ? pThr : 5
}

async function fetchProductPage(params = {}) {
  const page = Number(params.page) || 0 // UI 0-based
  const pageSize = Number(params.pageSize) || 10
  const search = params.search || ''
  const key = `${page}:${pageSize}:${search}:${params.status || ''}:${params.category || ''}`
  if (productsPageCache.key === key && Date.now() - productsPageCache.at < 2000) {
    return {
      rows: productsPageCache.rows,
      totalCount: productsPageCache.totalCount,
    }
  }
  const q = new URLSearchParams({
    page: String(page + 1), // API 1-based
    limit: String(pageSize),
    ...(search ? { search } : {}),
  })
  const res = await request(`/product/get-product?${q}`)
  let rows = (res.data || []).map(mapProduct)
  if (params.status && params.status !== 'all') {
    rows = rows.filter((r) => r.status === params.status)
  }
  if (params.category && params.category !== 'all') {
    rows = rows.filter((r) => r.category === params.category)
  }
  productsPageCache = {
    key,
    at: Date.now(),
    rows,
    totalCount: Number(res.totalCount || rows.length),
  }
  return { rows, totalCount: productsPageCache.totalCount }
}

async function fetchAllProducts(params = {}) {
  const search = params.search || ''
  if (
    allProductsCache.rows &&
    allProductsCache.search === search &&
    Date.now() - allProductsCache.at < 10_000
  ) {
    return allProductsCache.rows
  }
  const pageSize = 100
  let page = 1
  let all = []
  let total = Infinity
  while (all.length < total && page <= 30) {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...(search ? { search } : {}),
    })
    const res = await request(`/product/get-product?${q}`)
    const batch = (res.data || []).map(mapProduct)
    total = Number(res.totalCount ?? all.length + batch.length)
    all = all.concat(batch)
    if (batch.length < pageSize) break
    page += 1
  }
  allProductsCache = { at: Date.now(), search, rows: all }
  return all
}

async function fetchUsersMap() {
  if (usersMapCache.map && Date.now() - usersMapCache.at < 15_000) {
    return usersMapCache.map
  }
  try {
    const res = await request('/admin/users')
    const map = {}
    for (const u of res.data || []) {
      map[u.id ?? u._id] = u
    }
    usersMapCache = { at: Date.now(), map }
    return map
  } catch {
    return {}
  }
}

function mapPurchaseBill(b) {
  let lines = b.lines || b.items || []
  if (typeof lines === 'string') {
    try {
      lines = JSON.parse(lines)
    } catch {
      lines = []
    }
  }
  if (!Array.isArray(lines)) lines = []
  const items = lines.map((l) => ({
    inventoryId: l.product_id ? `inv-${l.product_id}` : undefined,
    productId: String(l.product_id ?? l.productId ?? ''),
    productName: l.description || l.product_name || l.name || 'Item',
    qtyOrdered: Number(l.quantity ?? l.qtyOrdered ?? 0),
    unitCost: Number(l.unit_price_excl_vat ?? l.unitPriceExclVat ?? l.unitCost ?? 0),
  }))
  const orderedQty =
    Number(b.total_qty) || items.reduce((s, i) => s + Number(i.qtyOrdered || 0), 0)
  let status = String(b.status || 'draft').toLowerCase()
  if (status === 'void') status = 'cancelled'
  else if (status === 'posted' || status === 'received') status = 'received'
  else if (status === 'draft') {
    const m = String(b.notes || '').match(/__ui:(\w+)__/)
    if (m?.[1]) status = m[1]
  }
  return {
    id: String(b.id ?? b._id),
    supplier: b.supplier?.name || b.supplier_name || b.supplier || 'Supplier',
    status,
    orderedQty,
    items,
    createdAt: b.created_at || b.createdAt,
    expectedDate: b.expected_date || b.expectedDate || null,
    notes: String(b.notes || '').replace(/__ui:\w+__\s*/g, '').trim(),
    _raw: b,
  }
}

export const backendApi = {
  auth: {
    async login({ email, password }) {
      const res = await request('/user/login', { method: 'POST', body: { email, password } })
      const token = res.data?.accesstoken
      const refreshToken = res.data?.refreshToken
      if (!token) throw new Error('No access token returned')
      const me = await request('/user/user-details', { token })
      const raw = me.data || me
      const user = mapUser(raw)
      if (!user?.role || (raw.role !== 'Admin' && raw.role !== 'Seller')) {
        throw new Error('Staff access only (Admin or Seller). Use the customer shop for buyer accounts.')
      }
      return { user, token, refreshToken }
    },
    async session(token) {
      const me = await request('/user/user-details', { token })
      const raw = me.data || me
      const user = mapUser(raw)
      if (!user?.role || (raw.role !== 'Admin' && raw.role !== 'Seller')) {
        throw new Error('Not a staff session')
      }
      return { user }
    },
    logout: (token) => request('/user/logout', { method: 'POST', token }),
    requestPasswordReset: (payload) =>
      request('/user/forgot-password', { method: 'POST', body: payload }),
    async resetPassword(payload) {
      // Shared API: verify OTP then set password
      if (payload.otp || payload.forgotPasswordOtp) {
        await request('/user/verify-forgot-password-otp', {
          method: 'POST',
          body: {
            email: payload.email,
            otp: payload.otp || payload.forgotPasswordOtp,
          },
        })
      }
      await request('/user/reset-password', {
        method: 'POST',
        body: {
          email: payload.email,
          otp: payload.otp || payload.forgotPasswordOtp || payload.token,
          newPassword: payload.password || payload.newPassword,
          password: payload.password || payload.newPassword,
        },
      })
      return { success: true }
    },
  },

  dashboard: {
    async stats() {
      const res = await request('/admin/stats')
      const d = res.data || {}
      const totalOrders = Number(d.ordersCount || 0)
      const totalUsers = Number(d.usersCount || 0)
      return {
        totalRevenue: Number(d.totalRevenue || 0),
        totalOrders,
        totalUsers,
        totalProducts: Number(d.productsCount || 0),
        revenueChange: 0,
        ordersChange: 0,
        usersChange: 0,
        productsChange: 0,
        conversionRate: totalUsers ? Math.round((totalOrders / totalUsers) * 1000) / 10 : 0,
      }
    },
    async salesSeries() {
      const res = await request('/order/sales-series?days=14')
      return (res.data || []).map((row) => ({
        date: String(row.date || '').slice(0, 10),
        revenue: Number(row.revenue || 0),
        orders: Number(row.orders || 0),
      }))
    },
    async recentOrders(params = {}) {
      const limit = Number(params.pageSize || params.limit || 5)
      const res = await request(`/order/admin-list?page=1&limit=${limit}`)
      return {
        rows: res.data || [],
        pageCount: 1,
        rowCount: Number(res.totalCount || 0),
      }
    },
  },

  customers: {
    async list(params) {
      const res = await request('/admin/users', { params: { role: 'User' } })
      const rows = (res.data || []).map((u) => {
        const m = mapUser(u)
        return {
          ...m,
          orderCount: Number(u.orderCount || u.ordersCount || 0),
          lifetimeValue: Number(u.lifetimeValue || u.totalSpent || 0),
          ordersCount: Number(u.orderCount || u.ordersCount || 0),
          totalSpent: Number(u.lifetimeValue || u.totalSpent || 0),
        }
      })
      return paginate(rows, params)
    },
    async getById(id) {
      try {
        const res = await request(`/admin/users/${encodeURIComponent(id)}`)
        const u = res.data
        if (!u) throw new Error('Customer not found')
        const orderCount = Number(u.orderCount || 0)
        const lifetimeValue = Number(u.lifetimeValue || 0)
        return {
          ...mapUser(u),
          orderCount,
          lifetimeValue,
          avgOrderValue: Number(
            u.avgOrderValue != null
              ? u.avgOrderValue
              : orderCount > 0
                ? lifetimeValue / orderCount
                : 0
          ),
          addresses: Array.isArray(u.addresses) ? u.addresses : [],
          tags: Array.isArray(u.tags) ? u.tags : [],
        }
      } catch {
        const res = await request('/admin/users')
        const u = (res.data || []).find((x) => String(x.id ?? x._id) === String(id))
        if (!u) throw new Error('Customer not found')
        const orderCount = Number(u.orderCount || 0)
        const lifetimeValue = Number(u.lifetimeValue || 0)
        return {
          ...mapUser(u),
          orderCount,
          lifetimeValue,
          avgOrderValue: orderCount > 0 ? lifetimeValue / orderCount : 0,
          addresses: [],
          tags: [],
        }
      }
    },
    async orders(id, params) {
      const page = (Number(params.page) || 0) + 1
      const pageSize = Number(params.pageSize) || 10
      const q = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        userId: String(id),
      })
      const res = await request(`/order/admin-list?${q}`)
      const totalCount = Number(res.totalCount || 0)
      return {
        rows: res.data || [],
        pageCount: Math.max(1, Math.ceil(totalCount / pageSize) || 1),
        rowCount: totalCount,
      }
    },
    async create(payload) {
      const res = await request('/admin/users', {
        method: 'POST',
        body: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          phone: payload.phone || payload.mobile || '',
          mobile: payload.phone || payload.mobile || '',
        },
      })
      usersMapCache = { at: 0, map: null }
      const u = res.data || {}
      return {
        ...mapUser(u),
        orderCount: 0,
        lifetimeValue: 0,
        avgOrderValue: 0,
        addresses: [],
        tags: [],
      }
    },
    async update(id, payload) {
      if (payload.status) {
        const status = payload.status === 'active' ? 'Active' : 'Inactive'
        await request(`/admin/users/${id}/status`, {
          method: 'PUT',
          body: { status },
        })
      }
      if (payload.role && ['Admin', 'Seller', 'User'].includes(payload.role)) {
        await request(`/admin/users/${id}/role`, {
          method: 'PUT',
          body: { role: payload.role },
        })
      }
      usersMapCache = { at: 0, map: null }
      return backendApi.customers.getById(id)
    },
  },

  products: {
    async list(params) {
      // Server-side page when only paging/search (avoids downloading full catalog)
      const canUseServerPage =
        (!params.category || params.category === 'all') &&
        (!params.status || params.status === 'all') &&
        (!params.sorting || params.sorting.length === 0)
      if (canUseServerPage) {
        const { rows, totalCount } = await fetchProductPage(params)
        const pageSize = Number(params.pageSize) || 10
        return {
          rows,
          pageCount: Math.max(1, Math.ceil(totalCount / pageSize) || 1),
          rowCount: totalCount,
        }
      }
      const rows = await fetchAllProducts(params)
      return paginate(rows, params)
    },
    async options(params = {}) {
      const rows = await fetchAllProducts()
      const filtered =
        params.status && params.status !== 'all'
          ? rows.filter((r) => r.status === params.status)
          : rows
      return {
        rows: filtered.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          status: p.status,
          variants: [],
        })),
      }
    },
    async getById(id) {
      const res = await request(`/product/get-product/${id}`)
      return mapProduct(res.data)
    },
    async analytics(id) {
      const [p, users, ordersRes] = await Promise.all([
        backendApi.products.getById(id),
        fetchUsersMap(),
        request(`/order/by-product/${encodeURIComponent(id)}?limit=500`),
      ])
      const lines = ordersRes.data || []
      const buyersMap = new Map()
      let sold = 0
      let revenue = 0
      let refunded = 0
      const orderHistory = []
      const refunds = []

      for (const line of lines) {
        const qty = Number(line.quantity || line.product_details?.quantity || 1)
        const lineRev = Number(line.lineTotal || line.line_total || line.unitPrice * qty || 0)
        const status = String(line.delivery_status || '')
        const isRefund =
          /refund|return|cancel/i.test(status) || /refund/i.test(String(line.payment_status || ''))
        if (isRefund) {
          refunded += qty
          refunds.push({
            id: String(line.id),
            orderId: line.orderId || line.order_id,
            qty,
            amount: lineRev,
            date: line.created_at || line.createdAt,
            status,
          })
        } else {
          sold += qty
          revenue += lineRev
        }
        const uid = line.userId || line.user_id
        const user = users[uid] || {}
        const buyer = buyersMap.get(uid) || {
          customerId: String(uid),
          customerName: user.name || user.email || `User ${uid}`,
          customerEmail: user.email || '',
          soldQty: 0,
          refundedQty: 0,
          orders: 0,
          orderCount: 0,
          lastPurchase: null,
        }
        if (isRefund) buyer.refundedQty += qty
        else {
          buyer.soldQty += qty
          buyer.orders += 1
          buyer.orderCount += 1
          buyer.lastPurchase = line.created_at || line.createdAt
        }
        buyersMap.set(uid, buyer)
        orderHistory.push({
          id: String(line.id),
          orderId: line.orderId || line.order_id,
          customerId: String(uid),
          customerName: buyer.customerName,
          qty,
          amount: lineRev,
          deliveryStatus: status,
          paymentStatus: line.payment_status,
          date: line.created_at || line.createdAt,
        })
      }

      return {
        product: { id: p.id, name: p.name, sku: p.sku, stock: p.stock },
        stats: {
          sold,
          refunded,
          complaints: 0,
          buyers: buyersMap.size,
          revenue: Math.round(revenue * 100) / 100,
        },
        buyers: [...buyersMap.values()],
        orderHistory,
        refunds,
        complaints: [],
      }
    },
    async create(payload) {
      const { catId, subId } = await ensureCatalogIds(payload.category)
      const body = {
        name: payload.name,
        image: [payload.image || PLACEHOLDER_IMAGE],
        category: [catId],
        subcategory: [subId],
        unit: payload.unit || 'pc',
        price: Number(payload.price),
        stock: Number(payload.stock ?? 0),
        description: payload.description || payload.name,
        publish: payload.status !== 'inactive',
      }
      const res = await request('/product/create', { method: 'POST', body })
      bustProductCaches()
      return mapProduct(res.data)
    },
    async update(id, payload) {
      const patch = { _id: id }
      if (payload.name != null) patch.name = payload.name
      if (payload.price != null) patch.price = Number(payload.price)
      if (payload.stock != null) patch.stock = Number(payload.stock)
      if (payload.description != null) patch.description = payload.description
      if (payload.status != null) patch.publish = payload.status !== 'inactive'
      if (payload.image) patch.image = [payload.image]
      if (payload.category) {
        const { catId, subId } = await ensureCatalogIds(payload.category)
        patch.category = [catId]
        patch.subcategory = [subId]
      }
      await request('/product/update-product', { method: 'PUT', body: patch })
      bustProductCaches()
      return backendApi.products.getById(id)
    },
    async remove(id) {
      await request('/product/delete-product', { method: 'DELETE', body: { _id: id } })
      bustProductCaches()
      return { ok: true }
    },
    async uploadImage(id, payload) {
      // Expect { url } or base64 — prefer URL from Cloudinary upload endpoint when available
      if (payload?.url) {
        return backendApi.products.update(id, { image: payload.url })
      }
      throw new Error('Provide an image URL (Cloudinary upload via /upload/upload).')
    },
    async exportCsv() {
      const rows = await fetchAllProducts()
      const header = ['id', 'name', 'category', 'price', 'stock', 'sku', 'status', 'description']
      const escape = (v) => {
        const s = String(v ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const lines = [
        header.join(','),
        ...rows.map((p) =>
          [p.id, p.name, p.category, p.price, p.stock, p.sku, p.status, p.description]
            .map(escape)
            .join(',')
        ),
      ]
      return {
        csv: lines.join('\n'),
        filename: `products-${new Date().toISOString().slice(0, 10)}.csv`,
      }
    },
    async importCsv({ csv }) {
      const text = String(csv || '')
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) return { imported: 0 }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      let imported = 0
      for (const line of lines.slice(1)) {
        const cols = []
        let cur = ''
        let inQ = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') {
              cur += '"'
              i++
            } else inQ = !inQ
          } else if (ch === ',' && !inQ) {
            cols.push(cur)
            cur = ''
          } else cur += ch
        }
        cols.push(cur)
        const row = Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim() ?? '']))
        if (!row.name) continue
        await backendApi.products.create({
          name: row.name,
          category: row.category || 'General',
          price: Number(row.price || 0),
          stock: Number(row.stock || 0),
          sku: row.sku || '',
          status: row.status === 'inactive' ? 'inactive' : 'active',
          description: row.description || row.name,
        })
        imported += 1
      }
      return { imported }
    },
    async categories() {
      const res = await request('/category/get-category')
      return (res.data || []).map((c) => c.name).filter(Boolean)
    },
  },

  orders: {
    async list(params) {
      const page = (Number(params.page) || 0) + 1
      const pageSize = Number(params.pageSize) || 10
      const q = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      if (params.search) q.set('search', params.search)
      const delivery = params.deliveryStatus || params.status
      if (delivery && delivery !== 'all') q.set('delivery_status', delivery)
      if (params.paymentStatus && params.paymentStatus !== 'all') {
        q.set('payment_status', params.paymentStatus)
      }
      if (params.dateFrom) q.set('date_from', params.dateFrom)
      if (params.dateTo) q.set('date_to', params.dateTo)
      const res = await request(`/order/admin-list?${q}`)
      const totalCount = Number(res.totalCount || 0)
      return {
        rows: res.data || [],
        pageCount: Math.max(1, Math.ceil(totalCount / pageSize) || 1),
        rowCount: totalCount,
      }
    },
    async getById(id) {
      const [users, linesRes, notesRes] = await Promise.all([
        fetchUsersMap(),
        request(`/order/group/${encodeURIComponent(id)}`),
        request(`/order/notes/${encodeURIComponent(id)}`).catch(() => ({ data: [] })),
      ])
      const row = groupOrders(linesRes.data || [], users).find((o) => String(o.id) === String(id))
        || groupOrders(linesRes.data || [], users)[0]
      if (!row) throw new Error('Order not found')
      row.internalNotes = (notesRes.data || []).map((n) => ({
        id: String(n.id ?? n._id),
        text: n.text,
        author: n.author || 'Staff',
        createdAt: n.createdAt || n.created_at,
      }))
      row.statusHistory = row.statusHistory || [
        {
          id: 'created',
          type: 'created',
          message: 'Order placed',
          timestamp: row.date,
          author: 'System',
        },
      ]
      return row
    },
    async updateStatus(id, payload) {
      const order = await backendApi.orders.getById(id)
      const lineId = order.lineIds?.[0]
      if (!lineId) throw new Error('No order lines to update')
      const body = { _id: lineId }
      if (payload.deliveryStatus != null) body.delivery_status = payload.deliveryStatus
      if (payload.paymentStatus != null) body.payment_status = payload.paymentStatus
      for (const lid of order.lineIds) {
        await request('/order/update-status', {
          method: 'PUT',
          body: { ...body, _id: lid },
        })
      }
      return backendApi.orders.getById(id)
    },
    async bulkUpdateStatus({ ids = [], ...payload }) {
      for (const id of ids) {
        await backendApi.orders.updateStatus(id, payload)
      }
      return { ok: true }
    },
    async addNote(id, { text, author }) {
      await request('/order/notes', {
        method: 'POST',
        body: { orderId: id, text, author },
      })
      return backendApi.orders.getById(id)
    },
    async create(payload) {
      const res = await request('/order/admin-create', {
        method: 'POST',
        body: {
          customerId: payload.customerId,
          items: payload.items,
          paymentStatus: payload.paymentStatus,
          deliveryStatus: payload.deliveryStatus,
          note: payload.note,
          author: payload.author,
        },
      })
      return backendApi.orders.getById(res.data?.id || res.data?.orderId)
    },
  },

  inventory: {
    async list(params) {
      const [products, warehouses, settings] = await Promise.all([
        fetchAllProducts(params.search ? { search: params.search } : {}),
        fetchWarehousesCached(),
        fetchSettingsCached(),
      ])
      const defaultWh = warehouses[0]?.name || 'Main Warehouse'
      const settingsThr = settings.lowStockThreshold
      let rows = products.map((p) => {
        const thr = resolveThreshold(p, settingsThr)
        const stockQuantity = Number(p.stock || 0)
        const lowStock = stockQuantity <= thr
        return {
          id: `inv-${p.id}`,
          inventoryId: `inv-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          category: p.category || 'Uncategorized',
          warehouse: defaultWh,
          warehouseId: warehouses[0]?.id ?? '1',
          stockQuantity,
          quantity: stockQuantity,
          threshold: thr,
          reorderPoint: thr,
          lowStock,
          status: lowStock ? 'low' : 'ok',
        }
      })
      if (params.stockLevel === 'low') rows = rows.filter((r) => r.lowStock)
      else if (params.stockLevel === 'ok' || params.stockLevel === 'in_stock') {
        rows = rows.filter((r) => !r.lowStock)
      }
      if (params.warehouse && params.warehouse !== 'all') {
        rows = rows.filter((r) => r.warehouse === params.warehouse)
      }
      return paginate(rows, params)
    },
    warehouses: () => fetchWarehousesCached(),
    adjustmentReasons: async () => ADJUSTMENT_REASONS,
    async movements(params) {
      const pageSize = Number(params.pageSize) || 50
      const page = Number(params.page) || 0
      const res = await request('/inventory/movements', {
        params: {
          limit: pageSize,
          skip: page * pageSize,
          ...(params.productId ? { productId: params.productId } : {}),
          ...(params.reasonCode && params.reasonCode !== 'all'
            ? { reason: params.reasonCode }
            : {}),
        },
      })
      const rows = (res.data || []).map((m) => {
        const delta = Number(m.delta ?? m.quantity_change ?? 0)
        const newQty = m.balance_after != null ? Number(m.balance_after) : null
        return {
          id: String(m.id ?? m._id),
          productId: String(m.product_id ?? m.productId ?? ''),
          productName: m.product_name || m.productName || `Product ${m.product_id || ''}`,
          delta,
          reason: m.movement_type || m.reason || m.type || '',
          reasonLabel: m.movement_type || m.reason || m.type || '',
          reasonCode: m.movement_type || m.reason || '',
          author: m.user_name || m.author || m.created_by || '',
          previousQty: newQty != null ? newQty - delta : null,
          newQty,
          createdAt: m.created_at || m.createdAt,
        }
      })
      // Server already paginated — don't re-slice away rows
      return {
        rows,
        pageCount: Math.max(1, rows.length < pageSize ? page + 1 : page + 2),
        rowCount: page * pageSize + rows.length + (rows.length === pageSize ? pageSize : 0),
      }
    },
    async adjust(payload) {
      const rawId =
        payload.productId ??
        String(payload.inventoryId || '').replace(/^inv-/, '')
      const productId = Number(rawId)
      const delta = Number(payload.delta ?? payload.quantity ?? 0)
      const qty = Math.abs(delta)
      const warehouseId =
        payload.warehouseId != null && payload.warehouseId !== ''
          ? Number(payload.warehouseId)
          : undefined
      if (!productId || !qty) throw new Error('productId and quantity required')
      const reason = payload.reasonCode || payload.reason || 'adjustment'
      const note = payload.note || ''
      if (delta >= 0) {
        await request('/inventory/add', {
          method: 'POST',
          body: { productId, warehouseId, quantity: qty, reason, note },
        })
      } else {
        await request('/inventory/remove', {
          method: 'POST',
          body: { productId, warehouseId, quantity: qty, reason, note },
        })
      }
      bustProductCaches()
      return { ok: true }
    },
    async reorderSuggestions(params) {
      const [products, settings] = await Promise.all([
        fetchAllProducts(),
        fetchSettingsCached(),
      ])
      let rows = products
        .map((p) => {
          const thr = resolveThreshold(p, settings.lowStockThreshold)
          const stock = Number(p.stock || 0)
          if (stock > thr) return null
          const ratio = thr > 0 ? stock / thr : 0
          const urgency =
            ratio <= 0.25 ? 'critical' : ratio <= 0.6 ? 'high' : 'medium'
          return {
            inventoryId: `inv-${p.id}`,
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            currentStock: stock,
            stock,
            threshold: thr,
            reorderPoint: thr,
            suggestedQty: Math.max(10, thr * 2 - stock),
            urgency,
          }
        })
        .filter(Boolean)
      if (params.urgency && params.urgency !== 'all') {
        rows = rows.filter((r) => r.urgency === params.urgency)
      }
      return paginate(rows, params)
    },
    purchaseOrders: {
      async list(params) {
        const page = Number(params.page) || 0
        const pageSize = Number(params.pageSize) || 10
        const res = await request('/purchases/bills', {
          params: {
            limit: 100,
            skip: 0,
            ...(params.status && params.status !== 'all' ? { status: params.status } : {}),
          },
        })
        let rows = (res.data || []).map(mapPurchaseBill)
        // Backend status is draft/received; UI may filter sent/partial via notes marker
        if (params.status && params.status !== 'all') {
          rows = rows.filter((r) => r.status === params.status)
        }
        return paginate(rows, { ...params, page, pageSize })
      },
      getById: async (id) => {
        const res = await request(`/purchases/bills/${id}`)
        return mapPurchaseBill(res.data || {})
      },
      async create(payload) {
        let supplierId = payload.supplierId
        if (!supplierId) {
          const name = payload.supplier || payload.supplierName || 'Default Supplier'
          const suppliers = await request('/purchases/suppliers')
          const existing = (suppliers.data || []).find(
            (s) => String(s.name).toLowerCase() === String(name).toLowerCase()
          )
          if (existing) supplierId = existing.id ?? existing._id
          else {
            const created = await request('/purchases/suppliers', {
              method: 'POST',
              body: { name },
            })
            supplierId = created.data?.id ?? created.data?._id
          }
        }
        const bill = await request('/purchases/bills', {
          method: 'POST',
          body: { supplierId, notes: payload.notes || 'PO from admin' },
        })
        const billId = bill.data?.id ?? bill.data?._id
        const lines = (payload.items || payload.lines || []).map((i) => ({
          productId: Number(i.productId),
          description: i.productName || i.name || i.description || 'Line',
          quantity: Number(i.qtyOrdered ?? i.qty ?? i.quantity ?? 1),
          unitPriceExclVat: Number(i.unitCost ?? i.price ?? i.unitPrice ?? 0),
        }))
        if (lines.length && billId) {
          await request(`/purchases/bills/${billId}`, {
            method: 'PATCH',
            body: { lines },
          })
        }
        bustProductCaches()
        return backendApi.inventory.purchaseOrders.getById(billId)
      },
      async updateStatus(id, payload) {
        const status = String(payload.status || '').toLowerCase()
        const current = await backendApi.inventory.purchaseOrders.getById(id)
        const baseNotes = current.notes || ''
        if (status === 'received' || status === 'complete' || status === 'completed') {
          await request(`/purchases/bills/${id}/receive`, { method: 'POST', body: {} })
          bustProductCaches()
        } else if (status === 'void' || status === 'cancelled') {
          await request(`/purchases/bills/${id}/void`, { method: 'POST', body: {} })
        } else if (status === 'sent' || status === 'partial') {
          await request(`/purchases/bills/${id}`, {
            method: 'PATCH',
            body: { notes: `__ui:${status}__ ${baseNotes}`.trim() },
          })
        } else if (payload.notes != null) {
          await request(`/purchases/bills/${id}`, {
            method: 'PATCH',
            body: { notes: payload.notes },
          })
        }
        return backendApi.inventory.purchaseOrders.getById(id)
      },
    },
  },

  settings: {
    async get() {
      return fetchSettingsCached()
    },
    async save(payload) {
      const settings = {
        currency: payload.currency,
        timezone: payload.timezone,
        tax_region: payload.region,
        region: payload.region,
        store_name: payload.storeName,
        company_legal_name: payload.storeName,
        low_stock_threshold: payload.lowStockThreshold,
        tax_rules: Array.isArray(payload.taxRules) ? payload.taxRules : [],
      }
      if (settings.tax_rules[0]?.rate != null) {
        settings.tax_percent = Number(settings.tax_rules[0].rate)
        settings.vat_standard_rate = Number(settings.tax_rules[0].rate)
      }
      await request('/shop/settings', { method: 'PUT', body: { settings } })
      settingsCache = { at: 0, data: null }
      return backendApi.settings.get()
    },
  },

  async search({ query, limit = 8 }) {
    const q = String(query || '').trim()
    if (!q) return { products: [], customers: [], orders: [] }
    const [products, customersPage, ordersPage] = await Promise.all([
      fetchAllProducts({ search: q }),
      backendApi.customers.list({ search: q, page: 0, pageSize: limit }),
      backendApi.orders.list({ search: q, page: 0, pageSize: limit }),
    ])
    return {
      products: products.slice(0, limit),
      customers: customersPage.rows.slice(0, limit),
      orders: ordersPage.rows.slice(0, limit),
    }
  },

  notifications: {
    async list() {
      const res = await request('/admin/notifications')
      return (res.data || []).map((n) => ({
        id: String(n.id ?? n._id),
        type: n.type || 'info',
        title: n.title,
        message: n.message || '',
        href: n.href || '/',
        read: Boolean(n.read),
        createdAt: n.createdAt || n.created_at,
      }))
    },
    async markRead(id) {
      const res = await request(`/admin/notifications/${id}/read`, { method: 'PATCH' })
      const n = res.data || {}
      return {
        id: String(n.id ?? id),
        type: n.type,
        title: n.title,
        message: n.message,
        href: n.href,
        read: true,
        createdAt: n.createdAt || n.created_at,
      }
    },
    async markAllRead() {
      await request('/admin/notifications/read-all', { method: 'POST' })
      return { success: true }
    },
  },

  account: {
    async get(token) {
      const me = await request('/user/user-details', { token })
      return mapUser(me.data || me)
    },
    async update(token, payload) {
      await request('/user/update-user', {
        method: 'PUT',
        body: { name: payload.name, mobile: payload.phone || payload.mobile },
        token,
      })
      return backendApi.account.get(token)
    },
    async updatePassword(token, payload) {
      await request('/user/update-user', {
        method: 'PUT',
        body: {
          currentPassword: payload.currentPassword,
          password: payload.newPassword || payload.password,
        },
        token,
      })
      return { success: true }
    },
  },
}
