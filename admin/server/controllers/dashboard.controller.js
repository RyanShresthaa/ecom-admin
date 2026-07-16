import { getDb } from '../db.js'
import { computeDashboardStats, computeSalesSeries, paginateList } from '../utils.js'

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

// Dashboard page: KPI summary cards payload.
export async function stats(_req, res) {
  res.json(computeDashboardStats(getDb()))
}

// Dashboard page: sales trend series for chart widgets.
export async function salesSeries(_req, res) {
  res.json(computeSalesSeries(getDb()))
}

// Dashboard page: compact recent orders table dataset.
export async function recentOrders(req, res) {
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
}

