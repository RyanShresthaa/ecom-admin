import { ADJUSTMENT_REASONS } from '@/lib/constants'
import { derivePaymentMethod } from '@/lib/paymentMethod'

// Shared helper layer for backend-api.js.
// Centralizes data mapping (backend -> UI shape), list pagination/grouping,
// and lightweight in-memory caches for repeated API fetches.
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/png'

export function createBackendApiHelpers({ request }) {
  // Role mapper: backend role names -> local RBAC role keys.
  function mapRole(backendRole) {
    if (backendRole === 'Admin') return 'admin'
    if (backendRole === 'Seller') return 'editor'
    return null
  }

  // User mapper: backend user payload -> normalized admin user shape.
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

  // Product mapper: backend product payload -> normalized admin product shape.
  function mapProduct(p) {
    if (!p) return null
    const id = p.id ?? p._id
    const categoryName =
      (Array.isArray(p.category) && (p.category[0]?.name || p.category[0])) ||
      p.category_name ||
      'Uncategorized'
    const variants = Array.isArray(p.variants)
      ? p.variants.map((v) => ({
          id: String(v.id ?? v._id ?? ''),
          size: v.size || '',
          color: v.color || '',
          sku: v.sku || '',
          stock: Number(v.stock ?? 0),
          price: v.price == null ? null : Number(v.price),
          image: v.image || null,
        }))
      : []
    return {
      id: String(id),
      name: p.name,
      category: typeof categoryName === 'string' ? categoryName : 'Uncategorized',
      price: Number(p.price || 0),
      stock: Number(p.stock ?? 0),
      sku: p.sku || `SKU-${id}`,
      barcode: p.barcode || '',
      brand: p.brand || '',
      status: p.publish === false ? 'inactive' : 'active',
      image: Array.isArray(p.image) ? p.image[0] || null : p.image || null,
      description: p.description || '',
      unit: p.unit || 'pc',
      publish: p.publish !== false,
      lowStockThreshold: p.low_stock_threshold ?? 5,
      variants,
      createdAt: p.created_at || p.createdAt,
      updatedAt: p.updated_at || p.updatedAt,
      _raw: p,
      soldQty: Number(p.soldQty ?? p.sold_qty ?? 0),
      refundedQty: Number(p.refundedQty ?? p.refunded_qty ?? 0),
      complaintCount: Number(p.complaintCount ?? p.complaint_count ?? 0),
    }
  }

  // Pagination helper: applies local search/filter/sort/page logic.
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

  // Orders grouper: merges order lines into single order objects for UI.
  function groupOrders(lines, usersById = {}) {
    const groups = new Map()
    for (const line of lines || []) {
      const key = line.orderId || line.order_id || String(line.id)
      if (!groups.has(key)) {
        const user = usersById[line.userId || line.user_id] || {}
        const paymentId = line.paymentId || line.payment_id || ''
        const paymentStatus = line.payment_status || line.paymentStatus || ''
        groups.set(key, {
          id: key,
          lineIds: [],
          customerId: String(line.userId || line.user_id || ''),
          customerName: user.name || user.email || `User ${line.userId || ''}`.trim(),
          customerEmail: user.email || '',
          deliveryStatus: line.delivery_status || line.deliveryStatus || 'Pending',
          paymentStatus,
          paymentId,
          paymentMethod: derivePaymentMethod(paymentId, paymentStatus),
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
      g.paymentId = line.paymentId || line.payment_id || g.paymentId
      g.paymentMethod = derivePaymentMethod(g.paymentId, g.paymentStatus)
    }
    return [...groups.values()]
      .map((g) => {
        if (/^returned$/i.test(g.deliveryStatus) && !/^refunded$/i.test(g.paymentStatus)) {
          g.paymentStatus = 'Refunded'
        }
        if (/^refunded$/i.test(g.paymentStatus) && !/^returned$/i.test(g.deliveryStatus)) {
          g.deliveryStatus = 'Returned'
        }
        g.paymentMethod = derivePaymentMethod(g.paymentId, g.paymentStatus)
        return g
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }

  // Catalog bootstrap: resolve or create category + subcategory IDs for product writes.
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

  // Cache invalidation: clear product list caches after create/update/delete.
  function bustProductCaches() {
    allProductsCache = { at: 0, search: '', rows: null }
    productsPageCache = { key: '', at: 0, rows: null, totalCount: 0 }
  }

  // Settings fetch with 15s TTL — used by inventory threshold and store config screens.
  async function fetchSettingsCached() {
    if (settingsCache.data && Date.now() - settingsCache.at < 15_000) {
      return settingsCache.data
    }
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

  // Warehouses fetch with 60s TTL — falls back to a default warehouse on API error.
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

  // Low-stock threshold resolver: prefers product-level, then settings, then default 5.
  function resolveThreshold(product, settingsThreshold) {
    const pThr = Number(product.lowStockThreshold)
    if (Number.isFinite(pThr) && pThr > 0 && pThr !== 5) return pThr
    const sThr = Number(settingsThreshold)
    if (Number.isFinite(sThr) && sThr > 0) return sThr
    return Number.isFinite(pThr) && pThr > 0 ? pThr : 5
  }

  // Products page fetch: paginated catalog with short-lived cache and local filters.
  async function fetchProductPage(params = {}) {
    const page = Number(params.page) || 0
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
      page: String(page + 1),
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

  // Full catalog fetch: walks pages until complete — used by order/inventory pickers.
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

  // Users map fetch with 15s TTL — keyed by ID for order/customer name resolution.
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

  // Purchase bill mapper: backend PO payload -> inventory purchase order UI shape.
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

  return {
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
  }
}
