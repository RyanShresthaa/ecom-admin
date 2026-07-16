import { nextId } from '../db.js'
import { syncCustomerStats } from '../utils.js'

// Table/query helper: normalizes `sorting` from query string into parsed array.
export function parseSorting(query) {
  if (query.sorting && typeof query.sorting === 'string') {
    try {
      query.sorting = JSON.parse(query.sorting)
    } catch {
      query.sorting = []
    }
  }
  return query
}

// Inventory/Product sync: recomputes product stock from inventory rows and rebalances variant stock totals.
export function syncProductStockFromInventory(db, productId) {
  const product = db.products.find((p) => p.id === productId)
  if (!product) return

  const total = db.inventory
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.stockQuantity, 0)
  product.stock = total

  if (product.variants?.length) {
    const variantTotal = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
    if (variantTotal === total) return

    if (variantTotal <= 0) {
      product.variants.forEach((variant, index) => {
        variant.stock = index === 0 ? total : 0
      })
      return
    }

    let remaining = total
    product.variants.forEach((variant, index) => {
      if (index === product.variants.length - 1) {
        variant.stock = remaining
        return
      }
      const share = Math.floor((total * (variant.stock || 0)) / variantTotal)
      variant.stock = share
      remaining -= share
    })
  }
}

// Inventory ledger: applies stock delta to one inventory row and records a movement entry.
export function recordStockMovement(db, item, { delta, reasonCode, reasonLabel, author, note }) {
  const threshold = item.threshold ?? db.settings.lowStockThreshold
  const previousQty = item.stockQuantity
  const newQty = Math.max(0, previousQty + delta)
  item.stockQuantity = newQty
  item.threshold = threshold
  item.lowStock = newQty <= threshold

  const movement = {
    id: nextId(db, 'movement', 'MOV'),
    inventoryId: item.id,
    productId: item.productId,
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
  }
  db.stockMovements.unshift(movement)
  return movement
}

// Inventory movements page: enriches raw movement with current product/inventory metadata.
export function enrichMovementRow(db, movement) {
  const inv = db.inventory.find((item) => item.id === movement.inventoryId)
  const product = db.products.find((p) => p.id === (movement.productId || inv?.productId))
  return {
    ...movement,
    productId: product?.id || movement.productId || inv?.productId || null,
    productName: product?.name || inv?.productName || movement.productName,
    sku: product?.sku || inv?.sku || movement.sku,
    warehouse: inv?.warehouse || movement.warehouse,
    currentStock: inv?.stockQuantity ?? null,
  }
}

// Inventory page: enriches inventory row with latest product fields and low-stock status.
export function enrichInventoryRow(db, item) {
  const product = db.products.find((p) => p.id === item.productId)
  const threshold = item.threshold ?? db.settings.lowStockThreshold
  return {
    ...item,
    productName: product?.name || item.productName,
    sku: product?.sku || item.sku,
    category: product?.category || item.category,
    threshold,
    lowStock: item.stockQuantity <= threshold,
  }
}

// Purchase orders pages: enriches PO line items with resolved product/inventory details.
export function enrichPurchaseOrder(db, po) {
  return {
    ...po,
    items: (po.items || []).map((item) => {
      const inv = db.inventory.find((row) => row.id === item.inventoryId)
      const product = db.products.find((p) => p.id === (item.productId || inv?.productId))
      return {
        ...item,
        productId: product?.id || item.productId || inv?.productId || null,
        productName: product?.name || inv?.productName || item.productName,
        sku: product?.sku || inv?.sku || item.sku,
        warehouse: inv?.warehouse || item.warehouse || null,
        currentStock: inv?.stockQuantity ?? null,
      }
    }),
  }
}

// Internal stock engine: adjusts product stock across inventory rows for sale/return operations.
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

// Variant stock engine: updates targeted/all variants while preventing negative stock.
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

// Product stock helper: returns available stock using inventory when present, fallback to product/variants.
export function getProductAvailableStock(dbOrProduct, maybeProduct) {
  const db = maybeProduct ? dbOrProduct : null
  const product = maybeProduct || dbOrProduct
  if (db) {
    const inventoryTotal = db.inventory
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.stockQuantity, 0)
    if (db.inventory.some((item) => item.productId === product.id)) return inventoryTotal
  }
  if (product.variants?.length) {
    return product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
  }
  return product.stock || 0
}

// Product model sync: keeps top-level `product.stock` aligned to variant totals.
export function syncProductStockField(product) {
  if (product.variants?.length) {
    product.stock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
  }
}

// Order lifecycle: reserves inventory and variant stock when order becomes sellable.
export function deductOrderStock(db, order, author) {
  if (order.stockDeducted) return

  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId)
    if (!product) throw new Error(`Product not found for ${item.name}`)
    if (getProductAvailableStock(db, product) < item.qty) {
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

// Order lifecycle: restores stock for returned/refunded orders.
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

// Order lifecycle: re-applies reservation after leaving return/refund state.
function reReserveOrderStock(db, order, author) {
  if (!order.stockReturned) return
  order.stockReturned = false
  order.stockDeducted = false
  deductOrderStock(db, order, author)
}

// Order timeline helper: appends structured status/note events.
function pushOrderHistory(order, entry) {
  order.statusHistory = order.statusHistory || []
  order.statusHistory.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  })
}

// Order status orchestrator: delivery/payment transitions, stock effects, and customer stats sync.
export function applyOrderStatusUpdates(db, order, { deliveryStatus, paymentStatus, author = 'System' } = {}) {
  const prevDelivery = order.deliveryStatus
  const prevPayment = order.paymentStatus

  let nextDelivery = deliveryStatus ?? prevDelivery
  let nextPayment = paymentStatus ?? prevPayment

  if (deliveryStatus === 'Returned' && nextPayment !== 'Refunded') {
    nextPayment = 'Refunded'
  }
  if (paymentStatus === 'Refunded' && nextDelivery !== 'Returned') {
    nextDelivery = 'Returned'
  }

  if (deliveryStatus && deliveryStatus !== 'Returned' && prevDelivery === 'Returned' && paymentStatus == null) {
    if (nextPayment === 'Refunded') nextPayment = 'Paid'
  }
  if (paymentStatus && paymentStatus !== 'Refunded' && prevPayment === 'Refunded' && deliveryStatus == null) {
    if (nextDelivery === 'Returned') nextDelivery = 'Delivered'
  }

  if (nextDelivery !== prevDelivery) {
    order.deliveryStatus = nextDelivery
    pushOrderHistory(order, {
      type: 'delivery',
      message: `Delivery status changed to ${nextDelivery}`,
      deliveryStatus: nextDelivery,
      author,
    })
  }

  if (nextPayment !== prevPayment) {
    order.paymentStatus = nextPayment
    pushOrderHistory(order, {
      type: 'payment',
      message: `Payment status changed to ${nextPayment}`,
      paymentStatus: nextPayment,
      author,
    })
  }

  const isReturnState = nextDelivery === 'Returned' || nextPayment === 'Refunded'
  const wasReturnState = prevDelivery === 'Returned' || prevPayment === 'Refunded'

  if (isReturnState) {
    returnOrderStock(db, order, author)
  } else if (wasReturnState && order.stockReturned) {
    reReserveOrderStock(db, order, author)
  } else if (nextDelivery === 'Shipped' || nextDelivery === 'Delivered') {
    deductOrderStock(db, order, author)
  }

  syncCustomerStats(db, order.customerId)
  return order
}

// Catalog/Inventory sync: ensures one inventory row per product and records stock drift movements.
export function syncInventoryFromProducts(db) {
  const threshold = db.settings.lowStockThreshold
  const primaryWarehouse = 'Main Warehouse'

  for (const product of db.products) {
    const targetStock = product.variants?.length
      ? product.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
      : Number(product.stock) || 0

    let items = db.inventory.filter((i) => i.productId === product.id)
    if (items.length === 0) {
      db.inventory.push({
        id: nextId(db, 'inventory', 'INV'),
        productId: product.id,
        productName: product.name,
        category: product.category,
        sku: product.sku,
        stockQuantity: targetStock,
        threshold,
        warehouse: primaryWarehouse,
        lowStock: targetStock <= threshold,
      })
      syncProductStockFromInventory(db, product.id)
      continue
    }

    if (items.length > 1) {
      const primary = items.find((item) => item.warehouse === primaryWarehouse) || items[0]
      const total = items.reduce((sum, item) => sum + (item.stockQuantity || 0), 0)
      primary.stockQuantity = total
      primary.warehouse = primaryWarehouse
      const keepId = primary.id
      db.inventory = db.inventory.filter((item) => item.productId !== product.id || item.id === keepId)
      items = [primary]
    }

    const [item] = items
    item.productName = product.name
    item.category = product.category
    item.sku = product.sku
    item.warehouse = primaryWarehouse
    item.threshold = threshold

    const currentTotal = item.stockQuantity || 0
    const delta = targetStock - currentTotal
    if (delta !== 0) {
      recordStockMovement(db, item, {
        delta,
        reasonCode: 'product_sync',
        reasonLabel: 'Product stock update',
        author: 'System',
        note: `Synced from product ${product.id}`,
      })
    } else {
      item.lowStock = currentTotal <= threshold
    }

    syncProductStockFromInventory(db, product.id)
  }
}

