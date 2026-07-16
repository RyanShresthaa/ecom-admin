import { getDb, nextId, updateDb } from '../db.js'

export function createInventoryController(deps) {
  const {
    parseSorting,
    paginateList,
    getReorderSuggestions,
    enrichInventoryRow,
    enrichMovementRow,
    recordStockMovement,
    syncProductStockFromInventory,
    enrichPurchaseOrder,
  } = deps

  // Inventory page: list inventory rows with stock-level filtering.
  async function list(req, res) {
    const db = getDb()
    const query = parseSorting({ ...req.query })
    const rows = db.inventory.map((item) => enrichInventoryRow(db, item))
    res.json(
      paginateList(rows, query, {
        searchFields: ['productName', 'sku', 'id', 'warehouse'],
        filterFn: (row, q) => {
          if (q.warehouse && q.warehouse !== 'all' && row.warehouse !== q.warehouse) return false
          if (q.stockLevel === 'low' && !row.lowStock) return false
          if (q.stockLevel === 'ok' && row.lowStock) return false
          return true
        },
      })
    )
  }

  // Inventory page: warehouse dropdown source.
  async function warehouses(_req, res) {
    res.json(getDb().warehouses)
  }

  // Inventory adjust modal: adjustment reason options.
  async function adjustmentReasons(_req, res) {
    res.json(getDb().adjustmentReasons)
  }

  // Inventory movements page: stock movement log with filters.
  async function movements(req, res) {
    const db = getDb()
    const query = parseSorting({ ...req.query })
    const rows = db.stockMovements.map((movement) => enrichMovementRow(db, movement))
    res.json(
      paginateList(rows, query, {
        searchFields: ['productName', 'sku', 'reasonLabel', 'warehouse'],
        filterFn: (row, q) => {
          if (q.reasonCode && q.reasonCode !== 'all' && row.reasonCode !== q.reasonCode) return false
          if (q.inventoryId && row.inventoryId !== q.inventoryId) return false
          return true
        },
      })
    )
  }

  // Inventory page: manual stock adjustment with optional low-stock notification.
  async function adjust(req, res) {
    const { inventoryId, delta, reasonCode, note, author } = req.body || {}
    let result = null
    await updateDb((db) => {
      const item = db.inventory.find((i) => i.id === inventoryId)
      if (!item) return
      const reason = db.adjustmentReasons.find((r) => r.code === reasonCode)
      const movement = recordStockMovement(db, item, {
        delta: Number(delta) || 0,
        reasonCode,
        reasonLabel: reason?.label || reasonCode,
        author: author || 'Staff',
        note: note || '',
      })
      syncProductStockFromInventory(db, item.productId)

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
      result = {
        success: true,
        inventory: enrichInventoryRow(db, item),
        movement: enrichMovementRow(db, movement),
      }
    })
    if (!result) return res.status(404).json({ message: 'Inventory item not found' })
    res.json(result)
  }

  // Inventory page: replenish suggestions based on urgency/threshold.
  async function reorderSuggestions(req, res) {
    res.json(getReorderSuggestions(getDb(), req.query.urgency))
  }

  // Purchase orders page: list POs with status filtering.
  async function purchaseOrders(req, res) {
    const db = getDb()
    const query = parseSorting({ ...req.query })
    const rows = db.purchaseOrders.map((po) => enrichPurchaseOrder(db, po))
    res.json(
      paginateList(rows, query, {
        searchFields: ['id', 'supplier'],
        filterFn: (row, q) => {
          if (q.status && q.status !== 'all' && row.status !== q.status) return false
          return true
        },
      })
    )
  }

  // Purchase order detail page: fetch one PO.
  async function getPurchaseOrderById(req, res) {
    const db = getDb()
    const po = db.purchaseOrders.find((p) => p.id === req.params.id)
    if (!po) return res.status(404).json({ message: 'Purchase order not found' })
    res.json(enrichPurchaseOrder(db, po))
  }

  // Purchase orders page: create draft PO.
  async function createPurchaseOrder(req, res) {
    let po = null
    await updateDb((db) => {
      const items = (req.body.items || []).map((item) => {
        const inv = db.inventory.find((row) => row.id === item.inventoryId)
        const product = db.products.find((p) => p.id === (item.productId || inv?.productId))
        return {
          inventoryId: item.inventoryId,
          productId: product?.id || item.productId || inv?.productId || null,
          productName: product?.name || inv?.productName || item.productName,
          sku: product?.sku || inv?.sku || item.sku,
          warehouse: inv?.warehouse || item.warehouse || null,
          qtyOrdered: Number(item.qtyOrdered) || 0,
          unitCost: Number(item.unitCost) || 0,
        }
      })
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
  }

  // Purchase order detail page: status transitions and receive-stock operation.
  async function updatePurchaseOrderStatus(req, res) {
    let updated = null
    await updateDb((db) => {
      const po = db.purchaseOrders.find((p) => p.id === req.params.id)
      if (!po) return
      const previousStatus = po.status
      po.status = req.body.status
      if (req.body.status === 'received' && previousStatus !== 'received') {
        const touchedProducts = new Set()
        for (const item of po.items) {
          const inv = db.inventory.find((i) => i.id === item.inventoryId)
          if (!inv) continue
          recordStockMovement(db, inv, {
            delta: Number(item.qtyOrdered) || 0,
            reasonCode: 'po_received',
            reasonLabel: 'Purchase order received',
            author: req.body.author || 'Staff',
            note: `PO ${po.id}`,
          })
          touchedProducts.add(inv.productId)
        }
        for (const productId of touchedProducts) {
          syncProductStockFromInventory(db, productId)
        }
      }
      updated = enrichPurchaseOrder(db, po)
    })
    if (!updated) return res.status(404).json({ message: 'Purchase order not found' })
    res.json(updated)
  }

  return {
    list,
    warehouses,
    adjustmentReasons,
    movements,
    adjust,
    reorderSuggestions,
    purchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
  }
}

