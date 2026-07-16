/**
 * Admin UI → shared backend (`backend/`) adapter.
 * Keeps the dashboard's expected shapes while calling Postgres API routes.
 */
import { request } from '@/lib/http'
import { createBackendApiHelpers } from '@/lib/api/backend-api.helpers'

// Main Admin API adapter used by the app.
// Defines feature-level operations (auth/dashboard/customers/products/orders/inventory/settings).
// Uses helper utilities for mapping, caching, and shared transforms.
const {
  ADJUSTMENT_REASONS,
  derivePaymentMethod,
  mapUser,
  mapProduct,
  paginate,
  groupOrders,
  ensureCatalogIds,
  bustProductCaches,
  fetchSettingsCached,
  fetchWarehousesCached,
  resolveThreshold,
  fetchProductPage,
  fetchAllProducts,
  fetchUsersMap,
  mapPurchaseBill,
} = createBackendApiHelpers({ request })

// Backend adapter: maps shared backend responses into admin UI-friendly shapes.
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
      const page = (Number(params.page) || 0) + 1
      const limit = Number(params.pageSize || params.limit || 5)
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (params.search) q.set('search', params.search)
      if (params.date) {
        q.set('date_from', params.date)
        q.set('date_to', params.date)
      }
      const res = await request(`/order/admin-list?${q}`)
      return {
        rows: res.data || [],
        pageCount: Math.max(1, Math.ceil(Number(res.totalCount || 0) / limit) || 1),
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
      const rows = (res.data || []).map((row) => ({
        ...row,
        paymentId: row.paymentId || '',
        paymentMethod: derivePaymentMethod(row.paymentId, row.paymentStatus),
      }))
      return {
        rows,
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
          addressLine: payload.addressLine || payload.address_line || '',
          city: payload.city || '',
          state: payload.state || '',
          pincode: payload.pincode || payload.zip || '',
          zip: payload.pincode || payload.zip || '',
          country: payload.country || '',
        },
      })
      usersMapCache = { at: 0, map: null }
      const u = res.data || {}
      return {
        ...mapUser(u),
        orderCount: 0,
        lifetimeValue: 0,
        avgOrderValue: 0,
        addresses: u.addresses || [],
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
    async exportDetailCsv(id) {
      const customer = await backendApi.customers.getById(id)
      const ordersPage = await backendApi.customers.orders(id, { page: 0, pageSize: 5000 })
      const addresses = (customer.addresses || [])
        .map((a) => [a.line1, a.line2, a.city, a.state, a.zip, a.country].filter(Boolean).join(' | '))
        .join(' ; ')
      const profileRows = [
        {
          section: 'profile',
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          status: customer.status || '',
          orderCount: customer.orderCount || 0,
          lifetimeValue: customer.lifetimeValue || 0,
          avgOrderValue: customer.avgOrderValue || 0,
          addresses,
          orderId: '',
          orderDate: '',
          paymentMethod: '',
          paymentStatus: '',
          deliveryStatus: '',
          orderTotal: '',
        },
      ]
      const orderRows = (ordersPage.rows || []).map((o) => ({
        section: 'order',
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        status: '',
        orderCount: '',
        lifetimeValue: '',
        avgOrderValue: '',
        addresses: '',
        orderId: o.id,
        orderDate: o.date,
        paymentMethod: o.paymentMethod || derivePaymentMethod(o.paymentId, o.paymentStatus),
        paymentStatus: o.paymentStatus || '',
        deliveryStatus: o.deliveryStatus || '',
        orderTotal: o.totalAmount ?? '',
      }))
      return {
        rows: [...profileRows, ...orderRows],
        customer,
        filename: `customer-${customer.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      }
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
          variants: p.variants || [],
        })),
      }
    },
    async getById(id) {
      const res = await request(`/product/get-product/${id}`)
      return mapProduct(res.data)
    },
    async analytics(id) {
      const [p, users, ordersRes, feedbackRes] = await Promise.all([
        backendApi.products.getById(id),
        fetchUsersMap(),
        request(`/order/by-product/${encodeURIComponent(id)}?limit=500`),
        request('/admin/feedback', { params: { targetType: 'product', limit: 500 } }).catch(() => ({ data: [] })),
      ])
      const lines = ordersRes.data || []
      const feedbackRows = (feedbackRes.data || []).filter(
        (row) => String(row.product_id ?? row.productId ?? '') === String(id)
      )
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
        const uid = line.userId || line.user_id
        const user = users[uid] || {}
        if (isRefund) {
          refunded += qty
          refunds.push({
            id: String(line.id),
            orderId: line.orderId || line.order_id,
            customerId: String(uid ?? ''),
            customerName: user.name || user.email || `User ${uid}`,
            customerEmail: user.email || '',
            qty,
            total: lineRev,
            date: line.created_at || line.createdAt,
            status,
          })
        } else {
          sold += qty
          revenue += lineRev
        }
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
          total: lineRev,
          deliveryStatus: status,
          paymentStatus: line.payment_status,
          date: line.created_at || line.createdAt,
          sold: !isRefund,
          refunded: isRefund,
          pending: /^pending$/i.test(status),
        })
      }

      const complaints = feedbackRows.map((entry) => {
        const uid = entry.user_id ?? entry.userId
        const user = users[uid] || {}
        return {
          id: String(entry.id ?? entry._id),
          orderId: entry.order_id || entry.orderId || 'N/A',
          customerId: String(uid ?? ''),
          customerName: entry.user_name || user.name || user.email || 'Anonymous',
          customerEmail: entry.user_email || user.email || '',
          text: entry.comment || entry.title || 'Complaint logged',
          author: entry.user_name || user.name || '',
          date: entry.created_at || entry.createdAt,
        }
      })

      return {
        product: { id: p.id, name: p.name, sku: p.sku, stock: p.stock },
        stats: {
          sold,
          refunded,
          complaints: complaints.length,
          buyers: buyersMap.size,
          revenue: Math.round(revenue * 100) / 100,
        },
        buyers: [...buyersMap.values()].map((b) => ({
          ...b,
          lastOrderDate: b.lastPurchase || null,
        })),
        orderHistory,
        refunds,
        complaints,
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
        sku: payload.sku || undefined,
        barcode: payload.barcode || undefined,
        brand: payload.brand || undefined,
        variants: Array.isArray(payload.variants) ? payload.variants : undefined,
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
      if (payload.sku != null) patch.sku = payload.sku
      if (payload.barcode != null) patch.barcode = payload.barcode
      if (payload.brand != null) patch.brand = payload.brand
      if (Array.isArray(payload.variants)) patch.variants = payload.variants
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
      const rows = (res.data || []).map((row) => ({
        ...row,
        paymentId: row.paymentId || '',
        paymentMethod: derivePaymentMethod(row.paymentId, row.paymentStatus),
      }))
      return {
        rows,
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
          paymentMethod: payload.paymentMethod,
          deliveryStatus: payload.deliveryStatus,
          note: payload.note,
          author: payload.author,
        },
      })
      return backendApi.orders.getById(res.data?.id || res.data?.orderId)
    },
    async exportMonthCsv({ year, month } = {}) {
      const now = new Date()
      const y = Number(year) || now.getFullYear()
      const m = Number(month) || now.getMonth() + 1
      const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const dateTo = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const res = await request(
        `/order/admin-list?${new URLSearchParams({
          page: '1',
          limit: '5000',
          date_from: dateFrom,
          date_to: dateTo,
        })}`
      )
      const rows = (res.data || []).map((row) => ({
        orderId: row.id,
        date: row.date,
        customerId: row.customerId,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        paymentMethod: derivePaymentMethod(row.paymentId, row.paymentStatus),
        paymentStatus: row.paymentStatus,
        deliveryStatus: row.deliveryStatus,
        itemCount: (row.items || []).length,
        totalAmount: row.totalAmount,
      }))
      return { rows, dateFrom, dateTo, year: y, month: m }
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
