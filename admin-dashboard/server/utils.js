export function paginateList(rows, query = {}, options = {}) {
  const { page = 0, pageSize = 10, search = '', sorting = [] } = query
  const { searchFields = [], filterFn } = options
  let filtered = [...rows]

  if (search && searchFields.length > 0) {
    const q = String(search).toLowerCase().trim()
    filtered = filtered.filter((row) =>
      searchFields.some((field) => {
        if (field === 'tags' && Array.isArray(row.tags)) {
          return row.tags.some((tag) => String(tag).toLowerCase().includes(q))
        }
        return String(row[field] ?? '').toLowerCase().includes(q)
      })
    )
  }

  if (filterFn) {
    filtered = filtered.filter((row) => filterFn(row, query))
  }

  if (Array.isArray(sorting) && sorting.length > 0) {
    const { id, desc } = sorting[0]
    filtered.sort((a, b) => {
      const av = a[id]
      const bv = b[id]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1

      const aDate = Date.parse(av)
      const bDate = Date.parse(bv)
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return desc ? bDate - aDate : aDate - bDate
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return desc ? bv - av : av - bv
      }

      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return desc ? -cmp : cmp
    })
  }

  const pageNum = Number(page)
  const size = Number(pageSize)
  const start = pageNum * size
  return {
    rows: filtered.slice(start, start + size),
    pageCount: Math.ceil(filtered.length / size) || 0,
    rowCount: filtered.length,
  }
}

export function toPublicUser({ password: _password, ...user }) {
  return user
}

export function computeDashboardStats(db) {
  const orders = db.orders
  const customers = db.customers
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.totalAmount : 0), 0)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const recentOrders = orders.filter((o) => new Date(o.date) >= thirtyDaysAgo)
  const priorOrders = orders.filter((o) => {
    const d = new Date(o.date)
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  })

  const recentRevenue = recentOrders.reduce((s, o) => s + (o.paymentStatus === 'Paid' ? o.totalAmount : 0), 0)
  const priorRevenue = priorOrders.reduce((s, o) => s + (o.paymentStatus === 'Paid' ? o.totalAmount : 0), 0)
  const revenueChange = priorRevenue > 0 ? Math.round(((recentRevenue - priorRevenue) / priorRevenue) * 1000) / 10 : 0
  const ordersChange =
    priorOrders.length > 0
      ? Math.round(((recentOrders.length - priorOrders.length) / priorOrders.length) * 1000) / 10
      : 0

  const recentCustomers = customers.filter((c) => new Date(c.createdAt) >= thirtyDaysAgo).length
  const priorCustomers = customers.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  }).length
  const usersChange =
    priorCustomers > 0 ? Math.round(((recentCustomers - priorCustomers) / priorCustomers) * 1000) / 10 : 0

  const conversionRate = customers.length > 0 ? Math.round((orders.length / customers.length) * 1000) / 10 : 0

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueChange,
    totalOrders: orders.length,
    ordersChange,
    totalUsers: customers.length,
    usersChange,
    conversionRate,
    conversionChange: 0,
  }
}

export function computeSalesSeries(db, days = 14) {
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const dayOrders = db.orders.filter((o) => o.date.startsWith(key))
    const revenue = Math.round(dayOrders.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100
    const orders = dayOrders.length
    const itemsSold = dayOrders.reduce(
      (sum, order) => sum + (order.items || []).reduce((qty, item) => qty + (item.qty || 0), 0),
      0
    )
    series.push({
      date: key,
      revenue,
      orders,
      itemsSold,
      avgOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
    })
  }
  return series
}

export function syncCustomerStats(db, customerId) {
  const customer = db.customers.find((c) => c.id === customerId)
  if (!customer) return
  const customerOrders = db.orders.filter((o) => o.customerId === customerId)
  customer.orderCount = customerOrders.length
  customer.lifetimeValue = Math.round(customerOrders.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100
  customer.lastOrderDate =
    customerOrders.length > 0
      ? customerOrders.reduce((latest, o) => (o.date > latest ? o.date : latest), customerOrders[0].date)
      : null
  customer.avgOrderValue =
    customer.orderCount > 0 ? Math.round((customer.lifetimeValue / customer.orderCount) * 100) / 100 : 0
}

export function syncInventoryLowStock(db) {
  const threshold = db.settings.lowStockThreshold
  for (const item of db.inventory) {
    item.threshold = threshold
    item.lowStock = item.stockQuantity <= threshold
  }
}

const COMPLAINT_PATTERN =
  /complaint|complained|damaged|defective|wrong item|missing item|poor quality|not as described|broken|issue with/i

export function isComplaintText(text) {
  return COMPLAINT_PATTERN.test(String(text || ''))
}

export function getEffectiveStock(product) {
  if (product.variants?.length) {
    return product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
  }
  return product.stock || 0
}

function isRefundedOrder(order) {
  return order.paymentStatus === 'Refunded' || order.deliveryStatus === 'Returned'
}

function isSoldOrder(order) {
  return order.paymentStatus === 'Paid' && !isRefundedOrder(order)
}

function getOrderLinesForProduct(order, productId) {
  const id = String(productId || '').trim()
  if (!id) return []
  return (order.items || []).filter((line) => String(line.productId || '').trim() === id)
}

function collectOrderComplaints(order, productId, complaints, complaintKeys) {
  const sources = [
    ...(order.internalNotes || []).map((note) => ({
      id: note.id,
      text: note.text,
      date: note.createdAt,
      author: note.author,
    })),
    ...(order.statusHistory || [])
      .filter((event) => event.type === 'note')
      .map((event) => ({
        id: event.id,
        text: event.message,
        date: event.timestamp,
        author: event.author,
      })),
  ]

  for (const source of sources) {
    if (!isComplaintText(source.text)) continue
    const key = `${order.id}:${productId}:${String(source.text).trim().toLowerCase()}`
    if (complaintKeys.has(key)) continue
    complaintKeys.add(key)
    complaints.push({
      id: source.id || key,
      orderId: order.id,
      productId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      text: source.text,
      date: source.date,
      author: source.author,
    })
  }
}

export function getProductMetrics(db, productId) {
  let soldQty = 0
  let refundedQty = 0
  let pendingQty = 0
  const complaints = []
  const complaintKeys = new Set()
  const buyerMap = new Map()
  const orderHistory = []

  for (const order of db.orders) {
    const lines = getOrderLinesForProduct(order, productId)
    if (lines.length === 0) continue

    const qty = lines.reduce((sum, line) => sum + (line.qty || 0), 0)
    const total = Math.round(lines.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100
    const refunded = isRefundedOrder(order)
    const sold = isSoldOrder(order)

    if (refunded) refundedQty += qty
    else if (sold) soldQty += qty
    else pendingQty += qty

    orderHistory.push({
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      qty,
      total,
      date: order.date,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      refunded,
      sold,
      pending: !refunded && !sold,
    })

    const buyerKey = order.customerId
    if (!buyerMap.has(buyerKey)) {
      buyerMap.set(buyerKey, {
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        soldQty: 0,
        refundedQty: 0,
        totalQty: 0,
        orderCount: 0,
        lastOrderDate: order.date,
      })
    }
    const buyer = buyerMap.get(buyerKey)
    buyer.totalQty += qty
    buyer.orderCount += 1
    if (refunded) buyer.refundedQty += qty
    else if (sold) buyer.soldQty += qty
    if (order.date > buyer.lastOrderDate) buyer.lastOrderDate = order.date

    collectOrderComplaints(order, productId, complaints, complaintKeys)
  }

  const buyers = [...buyerMap.values()].sort((a, b) => b.soldQty - a.soldQty || b.totalQty - a.totalQty)
  const refunds = orderHistory
    .filter((entry) => entry.refunded)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const soldOrders = orderHistory
    .filter((entry) => entry.sold)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  return {
    soldQty,
    refundedQty,
    pendingQty,
    complaintCount: complaints.length,
    buyers,
    complaints: complaints.sort((a, b) => new Date(b.date) - new Date(a.date)),
    refunds,
    soldOrders,
    orderHistory: orderHistory.sort((a, b) => new Date(b.date) - new Date(a.date)),
    revenue: Math.round(soldOrders.reduce((sum, entry) => sum + entry.total, 0) * 100) / 100,
  }
}

function countOrderComplaints(order) {
  const keys = new Set()
  const sources = [
    ...(order.internalNotes || []).map((note) => note.text),
    ...(order.statusHistory || [])
      .filter((event) => event.type === 'note')
      .map((event) => event.message),
  ]

  for (const text of sources) {
    if (!isComplaintText(text)) continue
    keys.add(`${order.id}:${String(text).trim().toLowerCase()}`)
  }
  return keys.size
}

export function getCustomerMetrics(db, customerId) {
  let soldQty = 0
  let refundedQty = 0
  let refundedAmount = 0
  let complaintCount = 0

  for (const order of db.orders.filter((entry) => entry.customerId === customerId)) {
    const orderQty = (order.items || []).reduce((sum, item) => sum + (item.qty || 0), 0)
    const refunded = isRefundedOrder(order)
    const sold = isSoldOrder(order)

    if (refunded) {
      refundedQty += orderQty
      refundedAmount += order.totalAmount || 0
    } else if (sold) {
      soldQty += orderQty
    }

    complaintCount += countOrderComplaints(order)
  }

  return {
    soldQty,
    refundedQty,
    refundedAmount: Math.round(refundedAmount * 100) / 100,
    complaintCount,
  }
}

export function enrichProductRow(db, product) {
  const metrics = getProductMetrics(db, product.id)
  return {
    ...product,
    createdAt: product.createdAt || new Date(0).toISOString(),
    stock: getEffectiveStock(product),
    soldQty: metrics.soldQty,
    refundedQty: metrics.refundedQty,
    complaintCount: metrics.complaintCount,
    pendingQty: metrics.pendingQty,
  }
}

export function enrichCustomerRow(db, customer) {
  const metrics = getCustomerMetrics(db, customer.id)
  return {
    ...customer,
    soldQty: metrics.soldQty,
    refundedQty: metrics.refundedQty,
    refundedAmount: metrics.refundedAmount,
    complaintCount: metrics.complaintCount,
  }
}

export function getReorderSuggestions(db, urgency) {
  const rows = db.inventory
    .filter((item) => item.lowStock)
    .map((item) => {
      const deficit = Math.max(0, item.threshold - item.stockQuantity)
      const suggestedQty = Math.max(deficit + 10, 25)
      let urg = 'medium'
      if (item.stockQuantity <= Math.floor(item.threshold * 0.25)) urg = 'critical'
      else if (item.stockQuantity <= Math.floor(item.threshold * 0.6)) urg = 'high'
      return {
        inventoryId: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        currentStock: item.stockQuantity,
        threshold: item.threshold,
        suggestedQty,
        urgency: urg,
        warehouse: item.warehouse,
      }
    })

  const filtered = urgency && urgency !== 'all' ? rows.filter((r) => r.urgency === urgency) : rows
  return { rows: filtered, rowCount: filtered.length }
}
