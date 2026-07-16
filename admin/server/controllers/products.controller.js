import { getDb, nextId, updateDb } from '../db.js'

function normalizeProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findProductByName(db, name, excludeId = null) {
  const normalized = normalizeProductName(name)
  if (!normalized) return null
  return (
    db.products.find(
      (product) => product.id !== excludeId && normalizeProductName(product.name) === normalized
    ) || null
  )
}

export function createProductsController(deps) {
  const {
    parseSorting,
    paginateList,
    enrichProductRow,
    getProductMetrics,
    getProductAvailableStock,
    syncProductStockField,
    syncInventoryFromProducts,
    removeProductFromOrders,
  } = deps

  // Products page: lightweight picker list for order/create dialogs.
  async function options(req, res) {
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
        stock: getProductAvailableStock(db, product),
        status: product.status,
        variants: product.variants || [],
        createdAt: product.createdAt,
      }))
    res.json({ rows })
  }

  // Products page: paginated table with search/category/status filters.
  async function list(req, res) {
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
  }

  // Products page: category filter options.
  async function categories(_req, res) {
    res.json(getDb().categories)
  }

  // Products page: CSV export for bulk edits.
  async function exportCsv(_req, res) {
    const db = getDb()
    const header = 'id,name,category,price,stock,sku,status'
    const lines = db.products.map((p) =>
      [p.id, p.name, p.category, p.price, p.stock, p.sku, p.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    res.json({ csv: [header, ...lines].join('\n'), filename: 'products.csv' })
  }

  // Products page: CSV import to create/update product records.
  async function importCsv(req, res) {
    const { csv } = req.body || {}
    const lines = String(csv || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    let imported = 0
    await updateDb((db) => {
      for (const line of lines) {
        const cols =
          line
            .match(/("([^"]|"")*"|[^,]+)/g)
            ?.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || []
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
          const id =
            rawId && !db.products.some((p) => p.id === rawId) ? rawId : nextId(db, 'product', 'PRD')
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
  }

  // Product detail page: analytics summary and related activity.
  async function analytics(req, res) {
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
  }

  // Product detail page: fetch one product with enriched fields.
  async function getById(req, res) {
    const db = getDb()
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(enrichProductRow(db, product))
  }

  // Products page: create a new product with duplicate-name protection.
  async function create(req, res) {
    const db = getDb()
    const duplicate = findProductByName(db, req.body?.name)
    if (duplicate) {
      return res.status(409).json({
        message: `A product named "${duplicate.name}" already exists. Change the name, or open the existing product if it's the same one.`,
        code: 'DUPLICATE_PRODUCT_NAME',
        existingProduct: { id: duplicate.id, name: duplicate.name, sku: duplicate.sku },
      })
    }

    let product = null
    await updateDb((db) => {
      const id = nextId(db, 'product', 'PRD')
      product = {
        id,
        name: String(req.body.name || '').trim(),
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
  }

  // Product detail/edit page: update product and keep inventory synchronized.
  async function update(req, res) {
    const db = getDb()
    const existing = db.products.find((p) => p.id === req.params.id)
    if (!existing) return res.status(404).json({ message: 'Product not found' })

    const nextName = req.body?.name != null ? String(req.body.name).trim() : existing.name
    const duplicate = findProductByName(db, nextName, req.params.id)
    if (duplicate) {
      return res.status(409).json({
        message: `A product named "${duplicate.name}" already exists. Change the name, or open the existing product if it's the same one.`,
        code: 'DUPLICATE_PRODUCT_NAME',
        existingProduct: { id: duplicate.id, name: duplicate.name, sku: duplicate.sku },
      })
    }

    let updated = null
    await updateDb((db) => {
      const idx = db.products.findIndex((p) => p.id === req.params.id)
      if (idx === -1) return
      const {
        soldQty: _soldQty,
        refundedQty: _refundedQty,
        complaintCount: _complaintCount,
        pendingQty: _pendingQty,
        ...safeBody
      } = req.body || {}
      updated = {
        ...db.products[idx],
        ...safeBody,
        id: req.params.id,
        name: nextName,
        price: Number(req.body.price ?? db.products[idx].price),
        stock: Number(req.body.stock ?? db.products[idx].stock),
      }
      db.products[idx] = updated
      syncInventoryFromProducts(db)
    })
    if (!updated) return res.status(404).json({ message: 'Product not found' })
    res.json(updated)
  }

  // Products page: delete product and clean linked inventory/order references.
  async function remove(req, res) {
    let found = false
    await updateDb((db) => {
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
  }

  // Product detail page: update primary image.
  async function updateImage(req, res) {
    let updated = null
    await updateDb((db) => {
      const idx = db.products.findIndex((p) => p.id === req.params.id)
      if (idx === -1) return
      db.products[idx].image = req.body?.imageDataUrl ?? db.products[idx].image
      updated = db.products[idx]
    })
    if (!updated) return res.status(404).json({ message: 'Product not found' })
    res.json(updated)
  }

  return {
    options,
    list,
    categories,
    exportCsv,
    importCsv,
    analytics,
    getById,
    create,
    update,
    remove,
    updateImage,
  }
}

