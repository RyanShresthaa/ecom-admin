import { randomBytes } from 'node:crypto'

import { Router } from 'express'

import { getDb, nextId, saveDb, updateDb } from './db.js'
import {
  computeDashboardStats,
  computeSalesSeries,
  enrichCustomerRow,
  enrichProductRow,
  getProductMetrics,
  getReorderSuggestions,
  paginateList,
  removeProductFromOrders,
  syncCustomerStats,
  syncInventoryLowStock,
  toPublicUser,
} from './utils.js'

const router = Router()

function getUserFromToken(db, token) {
  if (!token) return null
  const userId = db.sessions[token]
  if (!userId) return null
  const user = db.users.find((u) => u.id === userId)
  return user ? toPublicUser(user) : null
}

function requireAuth(req, res, next) {
  const db = getDb()
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const user = getUserFromToken(db, token)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  req.user = user
  req.token = token
  next()
}

function parseSorting(query) {
  if (query.sorting && typeof query.sorting === 'string') {
    try {
      query.sorting = JSON.parse(query.sorting)
    } catch {
      query.sorting = []
    }
  }
  return query
}

function syncProductStockFromInventory(db, productId) {
  const product = db.products.find((p) => p.id === productId)
  if (!product) return
  product.stock = db.inventory
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.stockQuantity, 0)
}

function recordStockMovement(db, item, { delta, reasonCode, reasonLabel, author, note }) {
  const previousQty = item.stockQuantity
  const newQty = Math.max(0, previousQty + delta)
  item.stockQuantity = newQty
  item.lowStock = newQty <= db.settings.lowStockThreshold

  db.stockMovements.unshift({
    id: nextId(db, 'movement', 'MOV'),
    inventoryId: item.id,
    productName: item.productName,
    sku: item.sku,
    reasonCode,
    reasonLabel,
    delta: newQty - previousQty,
    previousQty,
    newQty,
    warehouse: item.warehouse,
    author: author || 'System',
    note: note || '',
    createdAt: new Date().toISOString(),
  })
}

function adjustProductInventory(db, productId, quantity, context) {
  if (quantity === 0) return

  const product = db.products.find((p) => p.id === productId)
  if (!product) throw new Error('Product not found')

  const inventoryItems = db.inventory.filter((item) => item.productId === productId)
  if (inventoryItems.length === 0) throw new Error(`No inventory found for ${product.name}`)

  if (quantity < 0) {
    const requested = Math.abs(quantity)
    const available = inventoryItems.reduce((sum, item) => sum + item.stockQuantity, 0)
    if (available < requested) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }

    let remaining = requested
    for (const item of [...inventoryItems].sort((a, b) => b.stockQuantity - a.stockQuantity)) {
      if (remaining <= 0) break
      const amount = Math.min(item.stockQuantity, remaining)
      if (amount <= 0) continue
      recordStockMovement(db, item, { ...context, delta: -amount })
      remaining -= amount
    }
  } else {
    const [item] = inventoryItems
    recordStockMovement(db, item, { ...context, delta: quantity })
  }

  syncProductStockFromInventory(db, productId)
}

function updateVariantStock(product, variantId, quantity) {
  if (!product?.variants?.length) return
  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId)
    if (!variant) throw new Error(`Variant not found for ${product.name}`)
    const nextStock = (variant.stock || 0) + quantity
    if (nextStock < 0) throw new Error(`Insufficient variant stock for ${product.name}`)
    variant.stock = nextStock
    return
  }

  let remaining = Math.abs(quantity)
  const variants = [...product.variants].sort((a, b) => (b.stock || 0) - (a.stock || 0))
  for (const variant of variants) {
    if (remaining <= 0) break
    const available = variant.stock || 0
    if (available <= 0) continue
    const amount = Math.min(available, remaining)
    variant.stock = available - amount
    remaining -= amount
  }
  if (remaining > 0) {
    throw new Error(`Insufficient variant stock for ${product.name}`)
  }
}

function getProductAvailableStock(product) {
  if (product.variants?.length) {
    return product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
  }
  return product.stock || 0
}

function syncProductStockField(product) {
  if (product.variants?.length) {
    product.stock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
  }
}

function deductOrderStock(db, order, author) {
  if (order.stockDeducted) return

  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId)
    if (!product) throw new Error(`Product not found for ${item.name}`)
    if (getProductAvailableStock(product) < item.qty) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }
    updateVariantStock(product, item.variantId, -item.qty)
    syncProductStockField(product)
  }

  for (const item of order.items) {
    adjustProductInventory(db, item.productId, -item.qty, {
      reasonCode: 'sold',
      reasonLabel: 'Order stock reserved',
      author,
      note: `Order ${order.id}`,
    })
  }

  order.stockDeducted = true
  order.stockReturned = false
}

function returnOrderStock(db, order, author) {
  if (!order.stockDeducted || order.stockReturned) return

  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId)
    if (!product) continue
    if (item.variantId) {
      updateVariantStock(product, item.variantId, item.qty)
    } else if (product.variants?.length) {
      product.variants[0].stock = (product.variants[0].stock || 0) + item.qty
    }
    syncProductStockField(product)
    adjustProductInventory(db, item.productId, item.qty, {
      reasonCode: 'returned',
      reasonLabel: 'Order returned',
      author,
      note: `Order ${order.id}`,
    })
  }

  order.stockReturned = true
}

// --- Auth ---
router.post('/auth/login', (req, res) => {
  const db = getDb()
  const { email, password } = req.body || {}
  const match = db.users.find((u) => u.email === email && u.password === password)
  if (!match) return res.status(401).json({ message: 'Invalid email or password' })
  const token = randomBytes(32).toString('hex')
  db.sessions[token] = match.id
  saveDb()
  res.json({ user: toPublicUser(match), token })
})

router.get('/auth/session', (req, res) => {
  const db = getDb()
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const user = getUserFromToken(db, token)
  if (!user) return res.status(401).json({ message: 'Session expired' })
  res.json({ user })
})

router.post('/auth/logout', requireAuth, (req, res) => {
  updateDb((db) => {
    delete db.sessions[req.token]
  })
  res.json({ success: true })
})

router.post('/auth/forgot-password', (req, res) => {
  const db = getDb()
  const { email } = req.body || {}
  const user = db.users.find((u) => u.email === email)
  if (!user) return res.status(404).json({ message: 'No account found with that email' })
  const token = randomBytes(16).toString('hex')
  db.resetTokens[token] = { email, expires: Date.now() + 3600000 }
  saveDb()
  res.json({ success: true, devResetToken: token })
})

router.post('/auth/reset-password', (req, res) => {
  const db = getDb()
  const { token, password } = req.body || {}
  const reset = db.resetTokens[token]
  if (!reset || reset.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' })
  }
  const user = db.users.find((u) => u.email === reset.email)
  if (!user) return res.status(400).json({ message: 'Invalid reset token' })
  user.password = password
  delete db.resetTokens[token]
  saveDb()
  res.json({ success: true })
})

// --- Dashboard ---
router.get('/dashboard/stats', (_req, res) => {
  res.json(computeDashboardStats(getDb()))
})

router.get('/dashboard/sales-series', (_req, res) => {
  res.json(computeSalesSeries(getDb()))
})

router.get('/dashboard/recent-orders', (req, res) => {
  const db = getDb()
  const query = parseSorting({
    ...req.query,
    sorting: req.query.sorting || JSON.stringify([{ id: 'date', desc: true }]),
  })
  const list = paginateList(db.orders, query, {
    searchFields: ['id', 'customerName', 'customerEmail'],
    filterFn: (row, q) => {
      if (q.date && !String(row.date).startsWith(String(q.date))) return false
      return true
    },
  })
  list.rows = list.rows.map((o) => ({
    id: o.id,
    customerId: o.customerId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    date: o.date,
    totalAmount: o.totalAmount,
    paymentStatus: o.paymentStatus,
    deliveryStatus: o.deliveryStatus,
  }))
  res.json(list)
})

// --- Customers ---
router.get('/customers', (req, res) => {
  const db = getDb()
  const query = parseSorting({
    ...req.query,
    sorting: req.query.sorting || JSON.stringify([{ id: 'createdAt', desc: true }]),
  })
  const rows = db.customers.map((customer) => enrichCustomerRow(db, customer))
  const list = paginateList(rows, query, {
    searchFields: ['id', 'name', 'email', 'phone', 'tags'],
    filterFn: (row, q) => {
      if (q.tag && q.tag !== 'all') {
        const tag = String(q.tag).toLowerCase()
        if (!(row.tags || []).some((entry) => String(entry).toLowerCase() === tag)) return false
      }
      return true
    },
  })
  res.json(list)
})

router.get('/customers/:id', (req, res) => {
  const customer = getDb().customers.find((c) => c.id === req.params.id)
  if (!customer) return res.status(404).json({ message: 'Customer not found' })
  res.json(customer)
})

router.get('/customers/:id/orders', (req, res) => {
  const db = getDb()
  const query = parseSorting({ ...req.query })
  const rows = db.orders.filter((o) => o.customerId === req.params.id)
  res.json(paginateList(rows, query))
})

router.patch('/customers/:id', (req, res) => {
  let updated = null
  updateDb((db) => {
    const idx = db.customers.findIndex((c) => c.id === req.params.id)
    if (idx === -1) return
    db.customers[idx] = { ...db.customers[idx], ...req.body, id: req.params.id }
    updated = db.customers[idx]
  })
  if (!updated) return res.status(404).json({ message: 'Customer not found' })
  res.json(updated)
})

// --- Products ---
router.get('/products/options', (req, res) => {
  const db = getDb()
  const status = req.query.status || 'active'
  const rows = db.products
    .filter((product) => status === 'all' || product.status === status)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: getProductAvailableStock(product),
      status: product.status,
      variants: product.variants || [],
      createdAt: product.createdAt,
    }))
  res.json({ rows })
})

router.get('/products', (req, res) => {
  const db = getDb()
  const query = parseSorting({
    ...req.query,
    sorting: req.query.sorting || JSON.stringify([{ id: 'createdAt', desc: true }]),
  })
  const rows = db.products.map((product) => enrichProductRow(db, product))
  res.json(
    paginateList(rows, query, {
      searchFields: ['name', 'sku', 'id'],
      filterFn: (row, q) => {
        if (q.category && q.category !== 'all' && row.category !== q.category) return false
        if (q.status && q.status !== 'all' && row.status !== q.status) return false
        return true
      },
    })
  )
})

router.get('/products/categories', (_req, res) => {
  res.json(getDb().categories)
})

router.get('/products/export/csv', (_req, res) => {
  const db = getDb()
  const header = 'id,name,category,price,stock,sku,status'
  const lines = db.products.map((p) =>
    [p.id, p.name, p.category, p.price, p.stock, p.sku, p.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  res.json({ csv: [header, ...lines].join('\n'), filename: 'products.csv' })
})

router.post('/products/import/csv', (req, res) => {
  const { csv } = req.body || {}
  const lines = String(csv || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  let imported = 0
  updateDb((db) => {
    for (const line of lines) {
      const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || []
      if (cols.length < 6) continue

      const [rawId, name, category, price, stock, sku, status = 'active'] = cols
      if (rawId.toLowerCase() === 'id') continue

      const existing = rawId ? db.products.find((p) => p.id === rawId) : null
      if (existing) {
        Object.assign(existing, {
          name,
          category,
          price: Number(price),
          stock: Number(stock),
          sku: sku || existing.sku,
          status,
        })
        syncProductStockField(existing)
      } else {
        const id = rawId && !db.products.some((p) => p.id === rawId) ? rawId : nextId(db, 'product', 'PRD')
        let finalSku = sku || id
        while (db.products.some((p) => p.sku === finalSku)) {
          finalSku = `${finalSku}-${db.products.length + 1}`
        }
        const product = {
          id,
          name,
          category,
          price: Number(price),
          stock: Number(stock),
          sku: finalSku,
          status,
          description: '',
          image: null,
          variants: [],
          rating: 4.5,
          createdAt: new Date().toISOString(),
        }
        db.products.unshift(product)
      }
      imported++
    }
    syncInventoryFromProducts(db)
  })
  res.json({ imported })
})

router.get('/products/:id/analytics', (req, res) => {
  const db = getDb()
  const product = db.products.find((entry) => entry.id === req.params.id)
  if (!product) return res.status(404).json({ message: 'Product not found' })
  const metrics = getProductMetrics(db, product.id)
  res.json({
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock: enrichProductRow(db, product).stock,
    },
    stats: {
      sold: metrics.soldQty,
      refunded: metrics.refundedQty,
      complaints: metrics.complaintCount,
      buyers: metrics.buyers.length,
      revenue: metrics.revenue,
    },
    buyers: metrics.buyers,
    orderHistory: metrics.orderHistory,
    refunds: metrics.refunds,
    complaints: metrics.complaints,
  })
})

router.get('/products/:id', (req, res) => {
  const product = getDb().products.find((p) => p.id === req.params.id)
  if (!product) return res.status(404).json({ message: 'Product not found' })
  res.json(product)
})

router.post('/products', (req, res) => {
  let product = null
  updateDb((db) => {
    const id = nextId(db, 'product', 'PRD')
    product = {
      id,
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price) || 0,
      stock: Number(req.body.stock) || 0,
      sku: req.body.sku || id,
      status: req.body.status || 'active',
      description: req.body.description || '',
      image: req.body.image ?? null,
      variants: req.body.variants || [],
      rating: 4.5,
      createdAt: new Date().toISOString(),
    }
    db.products.unshift(product)
    syncInventoryFromProducts(db)
  })
  res.status(201).json(product)
})

router.put('/products/:id', (req, res) => {
  let updated = null
  updateDb((db) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) return
    updated = {
      ...db.products[idx],
      ...req.body,
      id: req.params.id,
      price: Number(req.body.price ?? db.products[idx].price),
      stock: Number(req.body.stock ?? db.products[idx].stock),
    }
    db.products[idx] = updated
    syncInventoryFromProducts(db)
  })
  if (!updated) return res.status(404).json({ message: 'Product not found' })
  res.json(updated)
})

router.delete('/products/:id', (req, res) => {
  let found = false
  updateDb((db) => {
    const before = db.products.length
    db.products = db.products.filter((p) => p.id !== req.params.id)
    db.inventory = db.inventory.filter((i) => i.productId !== req.params.id)
    found = db.products.length < before
    if (found) {
      removeProductFromOrders(db, req.params.id)
    }
  })
  if (!found) return res.status(404).json({ message: 'Product not found' })
  res.status(204).end()
})

router.post('/products/:id/image', (req, res) => {
  let updated = null
  updateDb((db) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) return
    db.products[idx].image = req.body?.imageDataUrl ?? db.products[idx].image
    updated = db.products[idx]
  })
  if (!updated) return res.status(404).json({ message: 'Product not found' })
  res.json(updated)
})

// --- Orders ---
router.get('/orders', (req, res) => {
  const db = getDb()
  const query = parseSorting({
    ...req.query,
    sorting: req.query.sorting || JSON.stringify([{ id: 'date', desc: true }]),
  })
  res.json(
    paginateList(db.orders, query, {
      searchFields: ['id', 'customerName', 'customerEmail'],
      filterFn: (row, q) => {
        if (q.deliveryStatus && q.deliveryStatus !== 'all' && row.deliveryStatus !== q.deliveryStatus) return false
        if (q.paymentStatus && q.paymentStatus !== 'all' && row.paymentStatus !== q.paymentStatus) return false
        if (q.customerId && row.customerId !== q.customerId) return false
        if (q.dateFrom && row.date < q.dateFrom) return false
        if (q.dateTo && row.date > q.dateTo) return false
        return true
      },
    })
  )
})

router.get('/orders/:id', (req, res) => {
  const order = getDb().orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  res.json(order)
})

router.patch('/orders/:id/status', (req, res) => {
  let updated = null
  try {
    updateDb((db) => {
      const idx = db.orders.findIndex((o) => o.id === req.params.id)
      if (idx === -1) return
      const order = db.orders[idx]
      const { deliveryStatus, paymentStatus } = req.body || {}
      const author = req.body.author || 'System'
      if (deliveryStatus) {
        order.deliveryStatus = deliveryStatus
        order.statusHistory.push({
          id: `hist-${Date.now()}`,
          type: 'delivery',
          message: `Delivery status changed to ${deliveryStatus}`,
          timestamp: new Date().toISOString(),
          deliveryStatus,
          author,
        })
        if (deliveryStatus === 'Shipped' || deliveryStatus === 'Delivered') {
          deductOrderStock(db, order, author)
        }
        if (deliveryStatus === 'Returned') {
          returnOrderStock(db, order, author)
        }
      }
      if (paymentStatus) {
        order.paymentStatus = paymentStatus
        order.statusHistory.push({
          id: `hist-${Date.now()}-p`,
          type: 'payment',
          message: `Payment status changed to ${paymentStatus}`,
          timestamp: new Date().toISOString(),
          paymentStatus,
          author,
        })
      }
      updated = order
    })
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Unable to update order status' })
  }
  if (!updated) return res.status(404).json({ message: 'Order not found' })
  res.json(updated)
})

router.post('/orders/bulk-status', (req, res) => {
  const { ids = [], deliveryStatus, paymentStatus } = req.body || {}
  let updated = 0
  try {
    updateDb((db) => {
      for (const id of ids) {
        const order = db.orders.find((o) => o.id === id)
        if (!order) continue
        const author = req.body.author || 'System'
        if (deliveryStatus) {
          order.deliveryStatus = deliveryStatus
          order.statusHistory.push({
            id: `hist-${Date.now()}-${id}`,
            type: 'delivery',
            message: `Delivery status changed to ${deliveryStatus}`,
            timestamp: new Date().toISOString(),
            deliveryStatus,
            author,
          })
          if (deliveryStatus === 'Shipped' || deliveryStatus === 'Delivered') {
            deductOrderStock(db, order, author)
          }
          if (deliveryStatus === 'Returned') {
            returnOrderStock(db, order, author)
          }
        }
        if (paymentStatus) order.paymentStatus = paymentStatus
        updated++
      }
    })
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Unable to update orders' })
  }
  res.json({ updated })
})

router.post('/orders/:id/notes', (req, res) => {
  let updated = null
  updateDb((db) => {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) return
    const note = {
      id: `note-${Date.now()}`,
      text: req.body.text,
      author: req.body.author || 'Staff',
      createdAt: new Date().toISOString(),
    }
    order.internalNotes = order.internalNotes || []
    order.internalNotes.push(note)
    order.statusHistory.push({
      id: `hist-${Date.now()}-n`,
      type: 'note',
      message: req.body.text,
      timestamp: note.createdAt,
      author: note.author,
    })
    updated = order
  })
  if (!updated) return res.status(404).json({ message: 'Order not found' })
  res.json(updated)
})

router.post('/orders', (req, res) => {
  let order = null
  try {
    updateDb((db) => {
      const customer = db.customers.find((c) => c.id === req.body.customerId)
      if (!customer) return
      const items = (req.body.items || []).map((item) => {
        const product = db.products.find((p) => p.id === item.productId)
        return {
          name: product?.name || 'Unknown product',
          sku: product?.sku || '',
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
          price: product?.price || 0,
        }
      })
      const totalAmount = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100
      const now = new Date().toISOString()
      const author = req.body.author || 'Staff'
      order = {
        id: nextId(db, 'order', 'ORD'),
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        date: now,
        totalAmount,
        paymentStatus: req.body.paymentStatus || 'Unpaid',
        deliveryStatus: req.body.deliveryStatus || 'Pending',
        shippingAddress: `${customer.addresses?.[0]?.line1 || ''}, ${customer.addresses?.[0]?.city || ''}`,
        items,
        internalNotes: req.body.note
          ? [{ id: `note-${Date.now()}`, text: req.body.note, author, createdAt: now }]
          : [],
        statusHistory: [
          { id: `hist-${Date.now()}`, type: 'created', message: 'Order created', timestamp: now, author },
        ],
        stockDeducted: false,
        stockReturned: false,
      }
      deductOrderStock(db, order, author)
      db.orders.unshift(order)
      syncCustomerStats(db, customer.id)
      db.notifications.unshift({
        id: nextId(db, 'notification', 'NTF'),
        type: 'order',
        title: 'New order created',
        message: `Order ${order.id} for ${customer.name}`,
        href: `/orders/${order.id}`,
        read: false,
        createdAt: now,
      })
    })
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Unable to create order' })
  }
  if (!order) return res.status(400).json({ message: 'Invalid order data' })
  res.status(201).json(order)
})

// --- Inventory ---
router.get('/inventory', (req, res) => {
  const db = getDb()
  const query = parseSorting({ ...req.query })
  res.json(
    paginateList(db.inventory, query, {
      searchFields: ['productName', 'sku', 'id', 'warehouse'],
      filterFn: (row, q) => {
        if (q.warehouse && q.warehouse !== 'all' && row.warehouse !== q.warehouse) return false
        if (q.stockLevel === 'low' && !row.lowStock) return false
        if (q.stockLevel === 'ok' && row.lowStock) return false
        return true
      },
    })
  )
})

router.get('/inventory/warehouses', (_req, res) => {
  res.json(getDb().warehouses)
})

router.get('/inventory/adjustment-reasons', (_req, res) => {
  res.json(getDb().adjustmentReasons)
})

router.get('/inventory/movements', (req, res) => {
  const db = getDb()
  const query = parseSorting({ ...req.query })
  res.json(
    paginateList(db.stockMovements, query, {
      searchFields: ['productName', 'sku', 'reasonLabel', 'warehouse'],
      filterFn: (row, q) => {
        if (q.reasonCode && q.reasonCode !== 'all' && row.reasonCode !== q.reasonCode) return false
        if (q.inventoryId && row.inventoryId !== q.inventoryId) return false
        return true
      },
    })
  )
})

router.post('/inventory/adjust', (req, res) => {
  const { inventoryId, delta, reasonCode, note, author } = req.body || {}
  let result = null
  updateDb((db) => {
    const item = db.inventory.find((i) => i.id === inventoryId)
    if (!item) return
    const reason = db.adjustmentReasons.find((r) => r.code === reasonCode)
    const previousQty = item.stockQuantity
    const newQty = Math.max(0, previousQty + delta)
    item.stockQuantity = newQty
    item.lowStock = newQty <= db.settings.lowStockThreshold

    const product = db.products.find((p) => p.id === item.productId)
    if (product) {
      const totalStock = db.inventory.filter((i) => i.productId === product.id).reduce((s, i) => s + i.stockQuantity, 0)
      product.stock = totalStock
    }

    const movement = {
      id: nextId(db, 'movement', 'MOV'),
      inventoryId,
      productName: item.productName,
      sku: item.sku,
      reasonCode,
      reasonLabel: reason?.label || reasonCode,
      delta,
      previousQty,
      newQty,
      warehouse: item.warehouse,
      author: author || 'Staff',
      note: note || '',
      createdAt: new Date().toISOString(),
    }
    db.stockMovements.unshift(movement)

    if (item.lowStock) {
      db.notifications.unshift({
        id: nextId(db, 'notification', 'NTF'),
        type: 'inventory',
        title: 'Low stock alert',
        message: `${item.productName} is below threshold in ${item.warehouse}`,
        href: '/inventory',
        read: false,
        createdAt: new Date().toISOString(),
      })
    }
    result = { success: true, inventory: item, movement }
  })
  if (!result) return res.status(404).json({ message: 'Inventory item not found' })
  res.json(result)
})

router.get('/inventory/reorder-suggestions', (req, res) => {
  res.json(getReorderSuggestions(getDb(), req.query.urgency))
})

router.get('/inventory/purchase-orders', (req, res) => {
  const db = getDb()
  const query = parseSorting({ ...req.query })
  res.json(
    paginateList(db.purchaseOrders, query, {
      searchFields: ['id', 'supplier'],
      filterFn: (row, q) => {
        if (q.status && q.status !== 'all' && row.status !== q.status) return false
        return true
      },
    })
  )
})

router.get('/inventory/purchase-orders/:id', (req, res) => {
  const po = getDb().purchaseOrders.find((p) => p.id === req.params.id)
  if (!po) return res.status(404).json({ message: 'Purchase order not found' })
  res.json(po)
})

router.post('/inventory/purchase-orders', (req, res) => {
  let po = null
  updateDb((db) => {
    const items = req.body.items || []
    const totalCost = Math.round(items.reduce((s, i) => s + i.qtyOrdered * i.unitCost, 0) * 100) / 100
    po = {
      id: nextId(db, 'po', 'PO'),
      supplier: req.body.supplier,
      items,
      totalCost,
      status: 'draft',
      createdAt: new Date().toISOString(),
      expectedDate: req.body.expectedDate || null,
      notes: req.body.notes || '',
    }
    db.purchaseOrders.unshift(po)
  })
  res.status(201).json(po)
})

router.patch('/inventory/purchase-orders/:id/status', (req, res) => {
  let updated = null
  updateDb((db) => {
    const po = db.purchaseOrders.find((p) => p.id === req.params.id)
    if (!po) return
    po.status = req.body.status
    if (req.body.status === 'received') {
      for (const item of po.items) {
        const inv = db.inventory.find((i) => i.id === item.inventoryId)
        if (inv) {
          inv.stockQuantity += item.qtyOrdered
          inv.lowStock = inv.stockQuantity <= db.settings.lowStockThreshold
        }
      }
      syncInventoryFromProducts(db)
    }
    updated = po
  })
  if (!updated) return res.status(404).json({ message: 'Purchase order not found' })
  res.json(updated)
})

// --- Settings ---
router.get('/settings', (_req, res) => {
  res.json(getDb().settings)
})

router.put('/settings', (req, res) => {
  let settings = null
  updateDb((db) => {
    db.settings = { ...db.settings, ...req.body }
    syncInventoryLowStock(db)
    settings = db.settings
  })
  res.json(settings)
})

// --- Search ---
router.get('/search', (req, res) => {
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
})

// --- Notifications ---
router.get('/notifications', (_req, res) => {
  res.json(getDb().notifications)
})

router.patch('/notifications/:id/read', (req, res) => {
  let updated = null
  updateDb((db) => {
    const n = db.notifications.find((x) => x.id === req.params.id)
    if (!n) return
    n.read = true
    updated = n
  })
  if (!updated) return res.status(404).json({ message: 'Notification not found' })
  res.json(updated)
})

router.post('/notifications/read-all', (_req, res) => {
  updateDb((db) => {
    for (const n of db.notifications) n.read = true
  })
  res.json({ success: true })
})

// --- Account ---
router.get('/account', requireAuth, (req, res) => {
  res.json(req.user)
})

router.patch('/account', requireAuth, (req, res) => {
  let updated = null
  updateDb((db) => {
    const idx = db.users.findIndex((u) => u.id === req.user.id)
    if (idx === -1) return
    db.users[idx] = { ...db.users[idx], name: req.body.name ?? db.users[idx].name, email: req.body.email ?? db.users[idx].email }
    updated = toPublicUser(db.users[idx])
  })
  res.json(updated)
})

router.post('/account/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const db = getDb()
  const user = db.users.find((u) => u.id === req.user.id)
  if (!user || user.password !== currentPassword) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }
  user.password = newPassword
  saveDb()
  res.json({ success: true })
})

function syncInventoryFromProducts(db) {
  const threshold = db.settings.lowStockThreshold
  for (const product of db.products) {
    const items = db.inventory.filter((i) => i.productId === product.id)
    if (items.length === 0) {
      const warehouseCount = db.warehouses.length || 1
      const baseQty = Math.floor(product.stock / warehouseCount)
      let remainder = product.stock % warehouseCount
      for (const warehouse of db.warehouses) {
        const stockQuantity = baseQty + (remainder > 0 ? 1 : 0)
        remainder = Math.max(0, remainder - 1)
        db.inventory.push({
          id: nextId(db, 'inventory', 'INV'),
          productId: product.id,
          productName: product.name,
          category: product.category,
          sku: product.sku,
          stockQuantity,
          threshold,
          warehouse,
          lowStock: stockQuantity <= threshold,
        })
      }
    } else {
      for (const item of items) {
        item.productName = product.name
        item.category = product.category
        item.sku = product.sku
        item.lowStock = item.stockQuantity <= threshold
      }
      product.stock = items.reduce((sum, item) => sum + item.stockQuantity, 0)
    }
  }
}

export default router
