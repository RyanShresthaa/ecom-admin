/** Maps backend API shapes to the admin dashboard contract. */

function applySort(rows, sorting) {
  if (!sorting?.length) return rows
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

export function paginate(rows, page, pageSize) {
  const start = page * pageSize
  return rows.slice(start, start + pageSize)
}

export function paginatedResult(rows, page, pageSize, sorting) {
  const sorted = applySort(rows, sorting)
  const rowCount = sorted.length
  return {
    rows: paginate(sorted, page, pageSize),
    pageCount: Math.max(1, Math.ceil(rowCount / pageSize)),
    rowCount,
  }
}

export function toAdminDeliveryStatus(status) {
  const raw = String(status || 'pending').trim().toLowerCase()
  const map = {
    pending: 'Pending',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  }
  return map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function toBackendDeliveryStatus(status) {
  return String(status || 'Pending').trim().toLowerCase()
}

export function toAdminPaymentStatus(status) {
  const raw = String(status || '').toUpperCase()
  if (raw.includes('REFUND')) return 'Refunded'
  if (raw.includes('CANCEL')) return 'Cancelled'
  if (raw.includes('UNPAID') || raw.includes('CASH') || raw.includes('PENDING')) return 'Unpaid'
  if (raw.includes('PAID')) return 'Paid'
  return raw ? 'Paid' : 'Unpaid'
}

/** Map admin Paid/Unpaid labels to backend payment_status values. */
export function toBackendPaymentStatus(status) {
  const label = String(status || '').trim()
  if (label === 'Paid') return 'PAID'
  if (label === 'Unpaid') return 'UNPAID'
  if (label === 'Refunded') return 'REFUNDED'
  if (label === 'Cancelled') return 'CANCELLED'
  return label || undefined
}

export function mapProduct(row) {
  if (!row) return null
  const categoryName = row.category?.[0]?.name ?? 'Uncategorized'
  const images = Array.isArray(row.image)
    ? row.image.filter((u) => typeof u === 'string' && u.trim())
    : typeof row.image === 'string' && row.image.trim()
      ? [row.image.trim()]
      : []
  return {
    id: String(row.id ?? row._id),
    name: row.name,
    category: categoryName,
    categoryId: row.category?.[0]?.id ?? row.category_id,
    subcategoryId: row.subcategory?.[0]?.id ?? row.subcategory_id,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    sku: row.sku ?? `SKU-${row.id ?? row._id}`,
    status: row.publish === false ? 'inactive' : 'active',
    /** Full gallery; index 0 is the thumbnail. */
    images,
    /** Thumbnail URL (first gallery image). */
    image: images[0] || '',
    createdAt: row.createdAt ?? row.created_at,
    rating: 0,
    _raw: row,
  }
}

export function formatAddress(address) {
  if (!address) return '—'
  if (typeof address === 'string') return address
  const parts = [
    address.address_line,
    address.addressLine,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ].filter(Boolean)
  return parts.join(', ') || '—'
}

export function groupOrderLines(lines, usersById = new Map()) {
  const groups = new Map()

  for (const line of lines) {
    const orderKey = String(line.orderId ?? line.order_id ?? line.id)
    const user = usersById.get(String(line.userId ?? line.user_id))
    const details = line.product_details ?? line.productDetails ?? {}
    const qty = Number(line.quantity ?? details.quantity ?? 1)
    // Checkout stores unit/line totals in shop display currency (USD/NPR), not catalog NPR.
    const unitPrice = Number(
      line.unitPrice ??
        line.unit_price ??
        details.unitPrice ??
        details.unit_price ??
        0,
    )
    const lineTotal = Number(
      line.lineTotal ?? line.line_total ?? details.lineTotal ?? unitPrice * qty,
    )
    const orderTotal = Number(line.totalAmt ?? line.total_amt)
    const subTotal = Number(line.subTotalAmt ?? line.sub_total_amt ?? 0)
    const taxAmt = Number(line.taxAmt ?? line.tax_amt ?? 0)
    const shippingAmt = Number(line.shippingAmt ?? line.shipping_amt ?? 0)
    const couponDiscount = Number(line.couponDiscount ?? line.coupon_discount ?? 0)
    const couponCode = line.couponCode ?? line.coupon_code ?? null
    const joinedName = String(line.customerName ?? line.customer_name ?? '').trim()
    const joinedEmail = String(line.customerEmail ?? line.customer_email ?? '').trim()
    const customerName =
      joinedName || String(user?.name || '').trim() || joinedEmail || user?.email || 'Customer'
    const customerEmail = joinedEmail || user?.email || ''
    const item = {
      productId: String(line.productId ?? line.product_id ?? ''),
      name: details.name ?? details.productName ?? 'Product',
      price: unitPrice,
      lineTotal,
      qty,
    }

    if (!groups.has(orderKey)) {
      groups.set(orderKey, {
        id: orderKey,
        lineIds: [],
        customerName,
        customerEmail,
        date: line.createdAt ?? line.created_at ?? new Date().toISOString(),
        items: [],
        subtotal: Number.isFinite(subTotal) ? subTotal : 0,
        taxAmt: Number.isFinite(taxAmt) ? taxAmt : 0,
        shippingAmt: Number.isFinite(shippingAmt) ? shippingAmt : 0,
        couponDiscount: Number.isFinite(couponDiscount) ? couponDiscount : 0,
        couponCode,
        totalAmount: Number.isFinite(orderTotal) && orderTotal > 0 ? orderTotal : lineTotal,
        paymentStatus: toAdminPaymentStatus(line.paymentStatus ?? line.payment_status),
        deliveryStatus: toAdminDeliveryStatus(line.deliveryStatus ?? line.delivery_status),
        shippingAddress: formatAddress(line.delivery_address ?? line.deliveryAddress),
      })
    }

    const group = groups.get(orderKey)
    // Prefer joined/user name if the first line had an empty placeholder.
    if ((!group.customerName || group.customerName === 'Customer') && customerName !== 'Customer') {
      group.customerName = customerName
    }
    if (!group.customerEmail && customerEmail) group.customerEmail = customerEmail
    group.lineIds.push(String(line.id ?? line._id))
    group.items.push(item)
    if (Number.isFinite(orderTotal) && orderTotal > 0) {
      // Same order total is duplicated on every line — take it once, don't sum.
      group.totalAmount = orderTotal
      group.subtotal = Number.isFinite(subTotal) ? subTotal : group.subtotal
      group.taxAmt = Number.isFinite(taxAmt) ? taxAmt : group.taxAmt
      group.shippingAmt = Number.isFinite(shippingAmt) ? shippingAmt : group.shippingAmt
      group.couponDiscount = Number.isFinite(couponDiscount)
        ? couponDiscount
        : group.couponDiscount
      if (couponCode) group.couponCode = couponCode
    } else {
      group.totalAmount = Number((group.totalAmount + lineTotal).toFixed(2))
    }
  }

  return [...groups.values()].sort((a, b) => new Date(b.date) - new Date(a.date))
}

function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildSalesSeries(orders, days = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = new Map()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    buckets.set(key, {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: 0,
      orders: new Set(),
    })
  }

  for (const order of orders) {
    const key = localDateKey(order.date)
    if (!key || !buckets.has(key)) continue
    // Skip cancelled orders so the chart reflects real activity
    if (String(order.deliveryStatus || '').toLowerCase() === 'cancelled') continue
    const bucket = buckets.get(key)
    bucket.revenue += Number(order.totalAmount) || 0
    bucket.orders.add(order.id)
  }

  return [...buckets.values()].map((b) => ({
    date: b.date,
    revenue: Number(b.revenue.toFixed(2)),
    orders: b.orders.size,
  }))
}

export function shopSettingsToAdmin(map = {}) {
  // Accept snake_case (API) or camelCase (cached admin form)
  const mode =
    String(map.region_mode || map.regionMode || 'us').toLowerCase() === 'nepal'
      ? 'nepal'
      : 'us'
  const taxRate = Number(map.tax_percent ?? map.vat_standard_rate ?? (mode === 'nepal' ? 13 : 0))
  let taxRules = []
  if (Array.isArray(map.admin_tax_rules)) {
    taxRules = map.admin_tax_rules
  } else {
    taxRules = [
      {
        id: 1,
        label: mode === 'nepal' ? 'VAT 13%' : 'Sales tax',
        rate: taxRate,
        region: mode === 'nepal' ? 'Nepal' : 'United States',
      },
    ]
  }

  return {
    regionMode: mode,
    taxRules,
    currency: mode === 'nepal' ? 'NPR' : 'USD',
    // Catalog product prices are always stored in NPR
    priceBaseCurrency: 'NPR',
    usdNprRate:
      Number(map.usd_npr_rate ?? map.usdNprRate) > 0
        ? Number(map.usd_npr_rate ?? map.usdNprRate)
        : 133,
    region: map.tax_region ?? map.region ?? (mode === 'nepal' ? 'Nepal' : 'United States'),
    timezone: map.admin_timezone ?? map.timezone ?? (mode === 'nepal' ? 'Asia/Kathmandu' : 'America/New_York'),
    storeName: map.company_legal_name ?? map.store_name ?? '',
    lowStockThreshold: Number(map.low_stock_threshold ?? 15),
  }
}

export function adminSettingsToShop(form) {
  const primaryTax = form.taxRules?.[0]
  const mode = form.regionMode === 'nepal' ? 'nepal' : 'us'
  const currency = mode === 'nepal' ? 'NPR' : 'USD'
  return {
    region_mode: mode,
    currency,
    price_base_currency: 'NPR',
    usd_npr_rate: Number(form.usdNprRate) > 0 ? Number(form.usdNprRate) : 133,
    tax_region: form.region,
    tax_percent: primaryTax?.rate ?? (mode === 'nepal' ? 13 : 0),
    vat_standard_rate: primaryTax?.rate ?? (mode === 'nepal' ? 13 : 0),
    purchase_default_currency: currency,
    company_legal_name: form.storeName,
    low_stock_threshold: form.lowStockThreshold,
    admin_timezone: form.timezone,
    admin_tax_rules: form.taxRules,
  }
}

export function mapProfile(user) {
  if (!user) return null
  return {
    id: String(user.id ?? user._id),
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.role ?? 'User',
    phone: user.mobile ?? '',
    bio: user.bio ?? '',
    avatar: user.avatar ?? null,
    createdAt: user.createdAt ?? user.created_at,
  }
}

export function buildNotifications(orders, products) {
  const notifications = []
  const now = Date.now()

  for (const order of orders.slice(0, 3)) {
    notifications.push({
      id: `ntf-order-${order.id}`,
      title: 'New order received',
      body: `Order ${order.id} from ${order.customerName} — ${order.totalAmount.toFixed(2)}`,
      type: 'order',
      read: false,
      href: `/orders?q=${encodeURIComponent(order.id)}`,
      createdAt: new Date(now - notifications.length * 15 * 60 * 1000).toISOString(),
    })
  }

  const lowStock = products.filter((p) => p.lowStock).slice(0, 2)
  for (const item of lowStock) {
    notifications.push({
      id: `ntf-inv-${item.productId}`,
      title: 'Low stock alert',
      body: `${item.productName} is below threshold (${item.stockQuantity} left)`,
      type: 'inventory',
      read: false,
      href: `/inventory?q=${encodeURIComponent(item.productName)}`,
      createdAt: new Date(now - (notifications.length + 1) * 30 * 60 * 1000).toISOString(),
    })
  }

  if (notifications.length === 0) {
    notifications.push({
      id: 'ntf-welcome',
      title: 'Admin dashboard connected',
      body: 'You are viewing live data from the backend API.',
      type: 'system',
      read: true,
      href: '/',
      createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
    })
  }

  return notifications
}
