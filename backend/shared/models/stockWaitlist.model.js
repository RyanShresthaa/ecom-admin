/**
 * stock_waitlist — emails customers when a product is back in stock.
 */
import pool from '../config/connectDB.js'
import { mapRow, mapRows, pickId } from '../utils/sql.js'

// Upsert a pending waitlist entry (idempotent per product/variant/email).
export async function upsertStockWaitlist({ productId, variantId = null, userId = null, email }) {
    const eid = String(email || '')
        .trim()
        .toLowerCase()
    if (!eid || !pickId(productId)) {
        const err = new Error('email and productId are required')
        err.status = 400
        throw err
    }

    const existing = await pool.query(
        `SELECT * FROM stock_waitlist
         WHERE product_id = $1
           AND COALESCE(variant_id, 0) = COALESCE($2::int, 0)
           AND lower(email) = $3
           AND notified_at IS NULL
         LIMIT 1`,
        [pickId(productId), pickId(variantId) || null, eid],
    )
    if (existing.rows[0]) return mapRow(existing.rows[0])

    const r = await pool.query(
        `INSERT INTO stock_waitlist (product_id, variant_id, user_id, email)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [pickId(productId), pickId(variantId) || null, pickId(userId) || null, eid],
    )
    return mapRow(r.rows[0])
}

// Pending waitlist rows for a product (optionally variant).
export async function listPendingWaitlistForProduct(productId, variantId = null) {
    const pid = pickId(productId)
    if (!pid) return []
    if (variantId) {
        const r = await pool.query(
            `SELECT * FROM stock_waitlist
             WHERE product_id = $1 AND variant_id = $2 AND notified_at IS NULL`,
            [pid, pickId(variantId)],
        )
        return mapRows(r.rows)
    }
    const r = await pool.query(
        `SELECT * FROM stock_waitlist
         WHERE product_id = $1 AND notified_at IS NULL`,
        [pid],
    )
    return mapRows(r.rows)
}

// Mark waitlist rows notified after emails are sent.
export async function markWaitlistNotified(ids = []) {
    const clean = ids.map(pickId).filter(Boolean)
    if (!clean.length) return 0
    const r = await pool.query(
        `UPDATE stock_waitlist SET notified_at = NOW()
         WHERE id = ANY($1::int[]) AND notified_at IS NULL`,
        [clean],
    )
    return r.rowCount
}
