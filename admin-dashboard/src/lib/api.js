/**
 * API client — all dashboard data flows through here to the Express backend.
 */
import { fetchCsrfToken, http, setCsrfToken } from '@/lib/http'

async function ensureCsrfToken() {
  await fetchCsrfToken()
}
import {
  adminSettingsToShop,
  groupOrderLines,
  mapProduct,
  mapProfile,
  paginatedResult,
  shopSettingsToAdmin,
  toBackendDeliveryStatus,
} from '@/lib/adapters'

let catalogCache = null
let usersCache = null
let ordersCache = null
let ordersCacheAt = 0
const ORDERS_CACHE_MS = 30_000

function invalidateOrdersCache() {
  ordersCache = null
  ordersCacheAt = 0
}

function invalidateCatalogCache() {
  catalogCache = null
}

async function loadCatalog() {
  if (catalogCache) return catalogCache
  const [catRes, subRes] = await Promise.all([
    http.get('/category/get-category'),
    http.get('/subcategory/get-subcategory'),
  ])
  catalogCache = {
    categories: catRes.data.data ?? [],
    subcategories: subRes.data.data ?? [],
  }
  return catalogCache
}

async function loadUsersMap() {
  if (usersCache) return usersCache
  const res = await http.get('/admin/users')
  const users = res.data.data ?? []
  usersCache = new Map(users.map((u) => [String(u.id ?? u._id), u]))
  return usersCache
}

async function loadGroupedOrders(force = false) {
  if (!force && ordersCache && Date.now() - ordersCacheAt < ORDERS_CACHE_MS) {
    return ordersCache
  }
  const usersById = await loadUsersMap()
  // Backend caps /order/all at 100/page — page until exhausted (max 50 pages safety)
  const allLines = []
  const limit = 100
  for (let page = 1; page <= 50; page += 1) {
    const ordersRes = await http.get('/order/all', { params: { page, limit } })
    const batch = ordersRes.data.data ?? []
    allLines.push(...batch)
    if (batch.length < limit) break
  }
  ordersCache = groupOrderLines(allLines, usersById)
  ordersCacheAt = Date.now()
  return ordersCache
}

function resolveCategoryRefs(categoryName, catalog) {
  const category =
    catalog.categories.find((c) => c.name === categoryName) ?? catalog.categories[0]
  const subcategory =
    catalog.subcategories.find(
      (s) => String(s.category_id ?? s.category?.[0]?.id) === String(category?.id ?? category?._id),
    ) ?? catalog.subcategories[0]

  return { category, subcategory }
}

function toProductPayload(form, catalog) {
  const { category, subcategory } = resolveCategoryRefs(form.category, catalog)
  const imageUrl = typeof form.image === 'string' ? form.image.trim() : ''
  if (!imageUrl) {
    throw new Error('Product image is required')
  }
  return {
    name: form.name,
    image: [imageUrl],
    category: category ? [category] : [],
    subcategory: subcategory ? [subcategory] : [],
    unit: 'pcs',
    price: form.price,
    stock: form.stock,
    description: form.description || form.name,
    publish: form.status !== 'inactive',
  }
}

export const api = {
  auth: {
    login: async (email, password) => {
      const res = await http.post('/user/login', { email, password })
      if (res.data.success === false) {
        throw new Error(res.data.message || 'Sign in failed')
      }
      // Session JWTs are httpOnly cookies only — never read access/refresh from JSON
      setCsrfToken(res.data.data?.csrfToken)
      usersCache = null
      invalidateOrdersCache()
      return res.data
    },
    logout: async () => {
      try {
        await http.post('/user/logout')
      } finally {
        setCsrfToken(null)
        usersCache = null
        catalogCache = null
        invalidateOrdersCache()
      }
    },
    me: async () => {
      const res = await http.get('/user/user-details')
      const user = res.data.data
      if (user?.role !== 'Admin') {
        throw new Error('Admin access required')
      }
      await ensureCsrfToken()
      return mapProfile(user)
    },
  },

  dashboard: {
    stats: async () => {
      const [statsRes, usersRes, orders] = await Promise.all([
        http.get('/admin/stats'),
        http.get('/admin/users'),
        // Small sample for conversion heuristic — totals come from /admin/stats
        http
          .get('/order/all', { params: { page: 1, limit: 100 } })
          .then(async (ordersRes) => {
            const usersById = await loadUsersMap()
            return groupOrderLines(ordersRes.data.data ?? [], usersById)
          }),
      ])
      const stats = statsRes.data.data ?? {}
      const users = usersRes.data.data ?? []
      const delivered = orders.filter((o) => o.deliveryStatus === 'Delivered').length
      const totalOrders = stats.ordersCount ?? orders.length

      return {
        totalRevenue: Number(stats.totalRevenue ?? 0),
        revenueChange: 0,
        totalOrders,
        ordersChange: 0,
        totalUsers: users.length,
        usersChange: 0,
        conversionRate: totalOrders ? Number(((delivered / totalOrders) * 100).toFixed(1)) : 0,
        conversionChange: 0,
      }
    },
    salesSeries: async (days = 14) => {
      const res = await http.get('/admin/sales-series', { params: { days } })
      return res.data.data ?? []
    },
    recentOrders: async (params = {}) => {
      const pageSize = params.pageSize ?? 5
      const usersById = await loadUsersMap()
      const ordersRes = await http.get('/order/all', {
        params: { page: 1, limit: Math.min(100, Math.max(pageSize * 3, 20)) },
      })
      const orders = groupOrderLines(ordersRes.data.data ?? [], usersById)
      return paginatedResult(orders, params.page ?? 0, pageSize, params.sorting)
    },
  },

  products: {
    list: async ({
      page = 0,
      pageSize = 10,
      sorting = [],
      search = '',
      category = 'all',
      status = 'all',
    } = {}) => {
      const catalog = await loadCatalog()
      const params = {
        page: page + 1,
        limit: pageSize,
      }
      if (search) params.search = search
      if (category !== 'all') {
        const cat = catalog.categories.find((c) => c.name === category)
        if (cat) params.categoryId = cat.id ?? cat._id
      }
      if (status !== 'all') params.published = status === 'active'
      if (sorting[0]?.id === 'price') {
        params.sort = sorting[0].desc ? 'price_desc' : 'price_asc'
      }

      const res = await http.get('/product/get-product', { params })
      const rows = (res.data.data ?? []).map(mapProduct)
      const totalCount = res.data.totalCount ?? rows.length
      return {
        rows,
        pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
        rowCount: totalCount,
      }
    },
    create: async (payload) => {
      const catalog = await loadCatalog()
      const body = toProductPayload(payload, catalog)
      const res = await http.post('/product/create', body)
      invalidateOrdersCache()
      return mapProduct(res.data.data)
    },
    update: async (id, payload) => {
      const catalog = await loadCatalog()
      const body = {
        _id: id,
        ...toProductPayload(payload, catalog),
      }
      await http.put('/product/update-product', body)
      invalidateOrdersCache()
      return mapProduct({ ...body, id, _id: id })
    },
    remove: async (id) => {
      await http.delete('/product/delete-product', { data: { _id: id } })
      invalidateOrdersCache()
      return { id }
    },
    categories: async () => {
      const catalog = await loadCatalog()
      return catalog.categories.map((c) => c.name)
    },
    uploadImage: async (file) => {
      const body = new FormData()
      body.append('image', file)
      const res = await http.post('/upload/upload', body)
      const url = res.data?.data
      if (!url || typeof url !== 'string') {
        throw new Error(res.data?.message || 'Image upload failed')
      }
      return url
    },
  },

  categories: {
    list: async () => {
      const catalog = await loadCatalog()
      return catalog.categories.map((c) => ({
        id: String(c.id ?? c._id),
        name: c.name,
        image: c.image || '',
        createdAt: c.createdAt ?? null,
      }))
    },
    create: async ({ name, image }) => {
      const trimmed = name?.trim()
      const imageUrl = typeof image === 'string' ? image.trim() : ''
      if (!trimmed) throw new Error('Category name is required')
      if (!imageUrl) throw new Error('Category image is required')

      const res = await http.post('/category/add-category', { name: trimmed, image: imageUrl })
      const created = res.data.data
      if (!res.data.success || !created) {
        throw new Error(res.data.message || 'Failed to create category')
      }

      // Products require a subcategory — create a default under the new category
      await http.post('/subcategory/add-subcategory', {
        name: 'General',
        image: imageUrl,
        category: [created],
      })

      invalidateCatalogCache()
      return {
        id: String(created.id ?? created._id),
        name: created.name,
        image: created.image || imageUrl,
      }
    },
    update: async (id, { name, image }) => {
      const body = { _id: id }
      if (name?.trim()) body.name = name.trim()
      if (image?.trim()) body.image = image.trim()
      const res = await http.put('/category/update-category', body)
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to update category')
      }
      invalidateCatalogCache()
      return { id, name: body.name, image: body.image }
    },
    remove: async (id) => {
      const res = await http.delete('/category/delete-category', { data: { _id: id } })
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to delete category')
      }
      invalidateCatalogCache()
      return { id }
    },
  },


  orders: {
    list: async (params = {}) => {
      let orders = await loadGroupedOrders()
      const {
        page = 0,
        pageSize = 10,
        sorting = [],
        search = '',
        deliveryStatus = 'all',
        paymentStatus = 'all',
        dateFrom = null,
        dateTo = null,
      } = params

      if (search) {
        const q = search.toLowerCase()
        orders = orders.filter(
          (o) => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q),
        )
      }
      if (deliveryStatus !== 'all') {
        orders = orders.filter((o) => o.deliveryStatus === deliveryStatus)
      }
      if (paymentStatus !== 'all') {
        orders = orders.filter((o) => o.paymentStatus === paymentStatus)
      }
      if (dateFrom) orders = orders.filter((o) => new Date(o.date) >= new Date(dateFrom))
      if (dateTo) orders = orders.filter((o) => new Date(o.date) <= new Date(dateTo))

      return paginatedResult(orders, page, pageSize, sorting)
    },
    getById: async (id) => {
      const orders = await loadGroupedOrders()
      const order = orders.find((o) => o.id === id)
      if (!order) throw new Error('Order not found')
      return order
    },
    updateStatus: async (id, { deliveryStatus, paymentStatus }) => {
      const orders = await loadGroupedOrders(true)
      const order = orders.find((o) => o.id === id)
      if (!order) throw new Error('Order not found')

      const body = {
        delivery_status: deliveryStatus ? toBackendDeliveryStatus(deliveryStatus) : undefined,
        payment_status: paymentStatus,
      }

      // Cancel applies to the whole checkout group in one request (stock + refund once)
      if (String(deliveryStatus).toLowerCase() === 'cancelled') {
        const res = await http.put('/order/update-status', {
          _id: order.lineIds[0],
          delivery_status: 'cancelled',
        })
        if (res.data.success === false) {
          throw new Error(res.data.message || 'Failed to cancel order')
        }
        invalidateOrdersCache()
        const paidLike =
          order.paymentStatus === 'Paid' ||
          String(order.paymentStatus || '')
            .toUpperCase()
            .includes('PAID')
        return {
          ...order,
          deliveryStatus: 'Cancelled',
          paymentStatus: paidLike ? 'Refunded' : 'Cancelled',
          _cancelMessage: res.data.message,
        }
      }

      await Promise.all(
        order.lineIds.map((_id) => http.put('/order/update-status', { _id, ...body })),
      )

      invalidateOrdersCache()
      return {
        ...order,
        deliveryStatus: deliveryStatus ?? order.deliveryStatus,
        paymentStatus: paymentStatus ?? order.paymentStatus,
      }
    },
  },

  inventory: {
    list: async (params = {}) => {
      const {
        page = 0,
        pageSize = 10,
        sorting = [],
        search = '',
        warehouse = 'all',
        stockLevel = 'all',
      } = params

      const allProducts = []
      const productLimit = 100
      const warehousesPromise = http.get('/inventory/warehouses')
      for (let productPage = 1; productPage <= 50; productPage += 1) {
        const productsRes = await http.get('/product/get-product', {
          params: { page: productPage, limit: productLimit },
        })
        const batch = productsRes.data.data ?? []
        allProducts.push(...batch)
        if (batch.length < productLimit) break
      }
      const warehousesRes = await warehousesPromise

      const warehouses = warehousesRes.data.data ?? []
      const defaultWarehouse =
        warehouses.find((w) => w.is_default) ?? warehouses[0]
      const warehouseLabel = defaultWarehouse
        ? `${defaultWarehouse.name}${defaultWarehouse.code ? ` (${defaultWarehouse.code})` : ''}`
        : 'Default warehouse'
      const warehouseId = defaultWarehouse ? String(defaultWarehouse.id ?? defaultWarehouse._id) : ''

      let rows = allProducts.map((p, index) => {
        const mapped = mapProduct(p)
        const threshold = Number(p.low_stock_threshold ?? 15)
        const stockQuantity = mapped.stock
        return {
          id: `INV-${String(index + 1).padStart(4, '0')}`,
          productId: mapped.id,
          productName: mapped.name,
          sku: mapped.sku,
          category: mapped.category,
          stockQuantity,
          warehouse: warehouseLabel,
          warehouseId,
          threshold,
          lowStock: stockQuantity < threshold,
        }
      })

      if (search) {
        const q = search.toLowerCase()
        rows = rows.filter(
          (i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
        )
      }
      if (warehouse !== 'all') {
        rows = rows.filter(
          (i) => i.warehouseId === warehouse || i.warehouse === warehouse,
        )
      }
      if (stockLevel === 'low') rows = rows.filter((i) => i.lowStock)
      if (stockLevel === 'ok') rows = rows.filter((i) => !i.lowStock)

      return paginatedResult(rows, page, pageSize, sorting)
    },
    warehouses: async () => {
      const res = await http.get('/inventory/warehouses')
      return (res.data.data ?? []).map((w) => ({
        id: String(w.id ?? w._id),
        name: w.name,
        code: w.code || '',
        label: w.code ? `${w.name} (${w.code})` : w.name,
        isDefault: Boolean(w.is_default),
      }))
    },
    add: async ({ productId, warehouseId, quantity, reason, note }) => {
      const res = await http.post('/inventory/add', {
        productId,
        warehouseId: warehouseId || undefined,
        quantity: Number(quantity),
        reason: reason || 'restock',
        note: note || undefined,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to add stock')
      return res.data
    },
    remove: async ({ productId, warehouseId, quantity, reason, note }) => {
      const res = await http.post('/inventory/remove', {
        productId,
        warehouseId: warehouseId || undefined,
        quantity: Number(quantity),
        reason: reason || 'adjustment',
        note: note || undefined,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to remove stock')
      return res.data
    },
    transfer: async ({ productId, fromWarehouseId, toWarehouseId, quantity, note }) => {
      const res = await http.post('/inventory/transfer', {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity: Number(quantity),
        note: note || undefined,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to transfer stock')
      return res.data
    },
  },

  coupons: {
    list: async () => {
      const res = await http.get('/coupon/list')
      return (res.data.data ?? []).map((c) => ({
        id: String(c.id ?? c._id),
        code: c.code,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value),
        minOrderAmt: Number(c.min_order_amt ?? 0),
        maxUses: c.max_uses ?? null,
        usedCount: Number(c.used_count ?? 0),
        expiresAt: c.expires_at ?? null,
        active: c.active !== false,
        createdAt: c.createdAt ?? c.created_at ?? null,
      }))
    },
    create: async (payload) => {
      const res = await http.post('/coupon/create', {
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: Number(payload.discountValue),
        min_order_amt: Number(payload.minOrderAmt ?? 0),
        max_uses: payload.maxUses === '' || payload.maxUses == null ? null : Number(payload.maxUses),
        expires_at: payload.expiresAt || null,
        active: payload.active !== false,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to create coupon')
      return res.data.data
    },
    update: async (id, payload) => {
      const res = await http.put(`/coupon/${id}`, {
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: Number(payload.discountValue),
        min_order_amt: Number(payload.minOrderAmt ?? 0),
        max_uses: payload.maxUses === '' || payload.maxUses == null ? null : Number(payload.maxUses),
        expires_at: payload.expiresAt || null,
        active: payload.active !== false,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to update coupon')
      return res.data.data
    },
    remove: async (id) => {
      const res = await http.delete(`/coupon/${id}`)
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to delete coupon')
      return { id }
    },
  },

  returns: {
    list: async () => {
      const res = await http.get('/return/all')
      return (res.data.data ?? []).map((r) => ({
        id: String(r.id ?? r._id),
        orderRowId: String(r.order_row_id ?? r.orderRowId ?? ''),
        userId: String(r.user_id ?? r.userId ?? ''),
        reason: r.reason || '',
        status: r.status || 'requested',
        adminNote: r.admin_note ?? r.adminNote ?? '',
        createdAt: r.createdAt ?? r.created_at ?? null,
      }))
    },
    update: async ({ id, status, adminNote }) => {
      const res = await http.put('/return/update', {
        _id: id,
        status,
        admin_note: adminNote || undefined,
      })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to update return')
      return res.data
    },
  },

  feedback: {
    list: async ({ targetType = 'all', limit = 50, skip = 0 } = {}) => {
      const params = { limit, skip }
      if (targetType && targetType !== 'all') params.targetType = targetType
      const res = await http.get('/admin/feedback', { params })
      return (res.data.data ?? []).map((f) => ({
        id: String(f.id ?? f._id),
        targetType: f.target_type ?? f.targetType ?? '',
        rating: f.rating ?? null,
        title: f.title || '',
        comment: f.comment || '',
        userName: f.user_name || f.userName || 'Guest',
        userEmail: f.user_email || f.userEmail || '',
        productId: f.product_id ?? f.productId ?? null,
        sellerId: f.seller_id ?? f.sellerId ?? null,
        createdAt: f.createdAt ?? f.created_at ?? null,
      }))
    },
  },

  googleReviews: {
    list: async () => {
      const res = await http.get('/google-reviews/admin')
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to load reviews')
      return (res.data.data ?? []).map((r) => ({
        id: String(r.id ?? r._id),
        name: r.name || '',
        role: r.role || '',
        text: r.text || '',
        rating: Number(r.rating ?? 5),
        initials: r.initials || '',
        color: r.color || '#8C523A',
        columnIndex: Number(r.columnIndex ?? 0),
        isVisible: Boolean(r.isVisible),
      }))
    },
    setVisibility: async (id, isVisible) => {
      const res = await http.put(`/google-reviews/${id}/visibility`, { isVisible })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to update visibility')
      return res.data.data
    },
    setAllVisibility: async (isVisible) => {
      const res = await http.put('/google-reviews/admin/bulk-visibility', { isVisible })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to update reviews')
      return res.data.data
    },
    syncFromGoogle: async () => {
      const res = await http.post('/google-reviews/admin/sync')
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to sync reviews')
      return res.data
    },
  },

  sellers: {
    requests: async () => {
      const res = await http.get('/admin/seller-requests')
      return (res.data.data ?? []).map((u) => ({
        id: String(u.id ?? u._id),
        name: u.name || '',
        email: u.email || '',
        mobile: u.mobile || '',
        status: u.status || '',
        role: u.role || '',
        createdAt: u.createdAt ?? u.created_at ?? null,
      }))
    },
    approve: async (id) => {
      const res = await http.post(`/admin/users/${id}/approve-seller`)
      if (res.data.success === false) throw new Error(res.data.message || 'Approve failed')
      return res.data
    },
    reject: async (id) => {
      const res = await http.post(`/admin/users/${id}/reject-seller`)
      if (res.data.success === false) throw new Error(res.data.message || 'Reject failed')
      return res.data
    },
  },

  audit: {
    list: async ({ limit = 50, skip = 0 } = {}) => {
      const res = await http.get('/admin/audit-logs', { params: { limit, skip } })
      return (res.data.data ?? []).map((row) => ({
        id: String(row.id ?? row._id),
        action: row.action || '',
        entityType: row.entity_type ?? row.entityType ?? '',
        entityId: row.entity_id ?? row.entityId ?? '',
        userId: row.user_id ?? row.userId ?? '',
        details: row.details ?? {},
        ip: row.ip || row.ip_address || '',
        createdAt: row.createdAt ?? row.created_at ?? null,
      }))
    },
  },

  blog: {
    list: async () => {
      const res = await http.get('/blog/admin')
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to load posts')
      return (res.data.data ?? []).map((p) => ({
        id: String(p.id ?? p._id),
        slug: p.slug || '',
        title: p.title || '',
        subtitle: p.subtitle || '',
        content: p.content || '',
        category: p.category || '',
        image: p.image || '',
        learnSectionTitle: p.learnSectionTitle || p.learn_section_title || '',
        learnItems: Array.isArray(p.learnItems)
          ? p.learnItems
          : Array.isArray(p.learn_items)
            ? p.learn_items
            : [],
        conclusion: p.conclusion || '',
        published: p.published !== false,
        publishedAt: p.publishedAt ?? p.published_at ?? null,
        createdAt: p.createdAt ?? p.created_at ?? null,
      }))
    },
    create: async (payload) => {
      const res = await http.post('/blog/admin', payload)
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to create post')
      return res.data.data
    },
    update: async (id, payload) => {
      const res = await http.put(`/blog/admin/${id}`, payload)
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to update post')
      return res.data.data
    },
    remove: async (id) => {
      const res = await http.delete(`/blog/admin/${id}`)
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to delete post')
      return { id }
    },
  },

  newsletter: {
    list: async ({ limit = 500 } = {}) => {
      const res = await http.get('/newsletter/admin', { params: { limit } })
      if (res.data.success === false) throw new Error(res.data.message || 'Failed to load subscribers')
      return (res.data.data ?? []).map((row) => ({
        id: String(row.id ?? row._id),
        email: row.email || '',
        source: row.source || '',
        active: row.active !== false,
        createdAt: row.createdAt ?? row.created_at ?? null,
      }))
    },
    exportCsv: async () => {
      const res = await http.get('/newsletter/admin/export', {
        responseType: 'blob',
        params: { active: true },
      })
      return res.data
    },
  },

  securityEvents: {
    list: async ({ limit = 100, skip = 0, action } = {}) => {
      const params = { limit, skip }
      if (action) params.action = action
      const res = await http.get('/admin/security-events', { params })
      return (res.data.data ?? []).map((row) => ({
        id: String(row.id ?? row._id),
        action: row.action || '',
        success: row.success !== false,
        userId: row.user_id ?? row.userId ?? '',
        userEmail: row.userEmail ?? row.user_email ?? '',
        ip: row.ip || '',
        userAgent: row.userAgent ?? row.user_agent ?? '',
        details: row.details ?? {},
        createdAt: row.createdAt ?? row.created_at ?? null,
      }))
    },
  },

  settings: {
    get: async () => {
      let map = {}
      try {
        const adminRes = await http.get('/shop/settings/admin')
        for (const row of adminRes.data.data ?? []) {
          map[row.key] = row.value
        }
      } catch {
        /* fall back to public settings */
      }
      const res = await http.get('/shop/settings')
      return shopSettingsToAdmin({ ...(res.data.data ?? {}), ...map })
    },
    save: async (payload) => {
      const settings = adminSettingsToShop(payload)
      const res = await http.put('/shop/settings', { settings })
      return shopSettingsToAdmin(res.data.data ?? settings)
    },
  },

  profile: {
    get: async () => {
      const res = await http.get('/user/user-details')
      return mapProfile(res.data.data)
    },
    update: async (payload) => {
      await http.put('/user/update-user', {
        name: payload.name,
        email: payload.email,
        mobile: payload.phone,
        bio: payload.bio ?? '',
      })
      return api.profile.get()
    },
  },

  notifications: {
    list: async () => {
      const res = await http.get('/admin/notifications')
      return res.data.data ?? []
    },
    markRead: async (id) => {
      const res = await http.post('/admin/notifications/mark-read', { id })
      return res.data.data ?? []
    },
    markAllRead: async () => {
      const res = await http.post('/admin/notifications/mark-all-read')
      return res.data.data ?? []
    },
  },

  search: {
    global: async ({ q = '', limit = 5 } = {}) => {
      if (String(q).trim().length < 2) {
        return { products: [], orders: [], customers: [] }
      }
      const res = await http.get('/admin/search', { params: { q, limit } })
      return res.data.data ?? { products: [], orders: [], customers: [] }
    },
  },
}

export { setCsrfToken } from '@/lib/http'
