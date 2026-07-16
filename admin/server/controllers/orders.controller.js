import { getDb, nextId, updateDb } from '../db.js'

export function createOrdersController(deps) {
  const { parseSorting, paginateList, applyOrderStatusUpdates, deductOrderStock, syncCustomerStats } = deps

  // Orders page: list orders with filters for status, customer, and date range.
  async function list(req, res) {
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
  }

  // Order detail page: fetch one order by id.
  async function getById(req, res) {
    const order = getDb().orders.find((o) => o.id === req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  }

  // Order detail page: change delivery/payment status with inventory side effects.
  async function updateStatus(req, res) {
    let updated = null
    try {
      await updateDb((db) => {
        const idx = db.orders.findIndex((o) => o.id === req.params.id)
        if (idx === -1) return
        const order = db.orders[idx]
        const { deliveryStatus, paymentStatus } = req.body || {}
        const author = req.body.author || 'System'
        updated = applyOrderStatusUpdates(db, order, { deliveryStatus, paymentStatus, author })
      })
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Unable to update order status' })
    }
    if (!updated) return res.status(404).json({ message: 'Order not found' })
    res.json(updated)
  }

  // Orders page: bulk status update action.
  async function bulkStatus(req, res) {
    const { ids = [], deliveryStatus, paymentStatus } = req.body || {}
    let updated = 0
    try {
      await updateDb((db) => {
        for (const id of ids) {
          const order = db.orders.find((o) => o.id === id)
          if (!order) continue
          const author = req.body.author || 'System'
          applyOrderStatusUpdates(db, order, { deliveryStatus, paymentStatus, author })
          updated++
        }
      })
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Unable to update orders' })
    }
    res.json({ updated })
  }

  // Order detail page: append an internal note.
  async function addNote(req, res) {
    let updated = null
    await updateDb((db) => {
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
  }

  // Create-order page: create an order for a customer and reserve stock.
  async function create(req, res) {
    let order = null
    try {
      await updateDb((db) => {
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
          paymentStatus: req.body.paymentStatus || 'Paid',
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
  }

  return { list, getById, updateStatus, bulkStatus, addNote, create }
}

