import pool from '../config/connectDB.js'
import { mapRow, mapRows, pickId } from '../utils/sql.js'

// notification model: handles notification table/entity CRUD and query helpers.
// notification model: listNotifications reads and returns records.
export async function listNotifications({ limit = 50 } = {}) {
  const r = await pool.query(
    `SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return mapRows(r.rows)
}

// notification model: createNotification creates a new record.
export async function createNotification({ type, title, message, href, dedupeKey }) {
  if (dedupeKey) {
    const existing = await pool.query(`SELECT * FROM admin_notifications WHERE dedupe_key = $1`, [
      dedupeKey,
    ])
    if (existing.rows[0]) return mapRow(existing.rows[0])
  }
  const r = await pool.query(
    `INSERT INTO admin_notifications (type, title, message, href, dedupe_key)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [type || 'info', title, message || '', href || '', dedupeKey || null]
  )
  return mapRow(r.rows[0])
}

// notification model: markNotificationRead updates existing records.
export async function markNotificationRead(id) {
  const r = await pool.query(
    `UPDATE admin_notifications SET read = true WHERE id = $1 RETURNING *`,
    [pickId(id)]
  )
  return mapRow(r.rows[0])
}

// notification model: markAllNotificationsRead updates existing records.
export async function markAllNotificationsRead() {
  await pool.query(`UPDATE admin_notifications SET read = true WHERE read = false`)
  return { success: true }
}

/** Ensure a low-stock notification exists for each product under threshold. */
// notification model: syncLowStockNotifications runs model logic/query operations.
export async function syncLowStockNotifications() {
  const r = await pool.query(
    `SELECT id, name, stock, COALESCE(low_stock_threshold, 5) AS thr
     FROM products
     WHERE publish IS DISTINCT FROM false
       AND stock <= COALESCE(low_stock_threshold, 5)`
  )
  for (const row of r.rows) {
    await createNotification({
      type: 'inventory',
      title: 'Low stock',
      message: `${row.name} has ${row.stock} left (threshold ${row.thr})`,
      href: `/products/${row.id}`,
      dedupeKey: `lowstock-${row.id}-${row.stock}`,
    })
  }
}

