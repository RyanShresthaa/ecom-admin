import { getDb, updateDb } from '../db.js'
import { enrichCustomerRow, paginateList } from '../utils.js'

// Query helper: parses sorting payload from query string when needed.
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

// Customers page: paginated customer list with search and tag filtering.
export async function listCustomers(req, res) {
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
}

// Customer detail page: returns one customer record.
export async function getCustomerById(req, res) {
  const customer = getDb().customers.find((c) => c.id === req.params.id)
  if (!customer) return res.status(404).json({ message: 'Customer not found' })
  res.json(customer)
}

// Customer detail page: returns orders for a selected customer.
export async function getCustomerOrders(req, res) {
  const db = getDb()
  const query = parseSorting({ ...req.query })
  const rows = db.orders.filter((o) => o.customerId === req.params.id)
  res.json(paginateList(rows, query))
}

// Customer edit page: applies partial updates to customer fields.
export async function patchCustomer(req, res) {
  let updated = null
  await updateDb((db) => {
    const idx = db.customers.findIndex((c) => c.id === req.params.id)
    if (idx === -1) return
    db.customers[idx] = { ...db.customers[idx], ...req.body, id: req.params.id }
    updated = db.customers[idx]
  })

  if (!updated) return res.status(404).json({ message: 'Customer not found' })
  res.json(updated)
}

