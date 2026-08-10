/**
 * PostgreSQL: `order_returns` — link to order row + status + resolution.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

const OPEN_STATUSES = ['requested'];

function mapReturn(row) {
    if (!row) return null;
    const mapped = mapRow(row);
    return {
        ...mapped,
        order_row_id: row.order_row_id,
        resolution: row.resolution || mapped.resolution || 'refund',
        admin_note: row.admin_note ?? mapped.adminNote ?? mapped.admin_note ?? '',
    };
}

export async function createReturnRequest({ orderRowId, userId, reason, resolution = 'refund' }) {
    const r = await pool.query(
        `INSERT INTO order_returns (order_row_id, user_id, reason, resolution)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [orderRowId, userId, reason || '', resolution],
    );
    return mapReturn(r.rows[0]);
}

export async function findOpenReturnForOrderRow(orderRowId) {
    const r = await pool.query(
        `SELECT * FROM order_returns
         WHERE order_row_id = $1 AND LOWER(status) = ANY($2::text[])
         ORDER BY id DESC LIMIT 1`,
        [orderRowId, OPEN_STATUSES],
    );
    return mapReturn(r.rows[0]);
}

export async function findReturnsByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM order_returns WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return r.rows.map(mapReturn);
}

export async function findAllReturns() {
    const r = await pool.query(`SELECT * FROM order_returns ORDER BY created_at DESC`);
    return r.rows.map(mapReturn);
}

export async function findReturnById(id) {
    const r = await pool.query(`SELECT * FROM order_returns WHERE id = $1`, [pickId(id)]);
    return mapReturn(r.rows[0]);
}

export async function updateReturnStatus(id, status, adminNote) {
    const r = await pool.query(
        `UPDATE order_returns SET status = $1, admin_note = COALESCE($2, admin_note), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [status, adminNote, id],
    );
    return mapReturn(r.rows[0]);
}
