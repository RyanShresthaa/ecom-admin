import pool from '../config/connectDB.js'
import { mapRow, mapRows } from '../utils/sql.js'

// orderNotes model: handles orderNotes table/entity CRUD and query helpers.
// orderNotes model: listNotesForOrderGroup reads and returns records.
export async function listNotesForOrderGroup(orderGroupId) {
  const r = await pool.query(
    `SELECT * FROM order_notes WHERE order_group_id = $1 ORDER BY created_at ASC`,
    [orderGroupId]
  )
  return mapRows(r.rows)
}

// orderNotes model: addOrderNote creates a new record.
export async function addOrderNote({ orderGroupId, text, author }) {
  const r = await pool.query(
    `INSERT INTO order_notes (order_group_id, text, author) VALUES ($1,$2,$3) RETURNING *`,
    [orderGroupId, text, author || '']
  )
  return mapRow(r.rows[0])
}

