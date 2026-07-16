// return model: handles return table/entity CRUD and query helpers.
/**
 * PostgreSQL: `order_returns` — link to order row + status.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

// return model: createReturnRequest creates a new record.
export async function createReturnRequest({ orderRowId, userId, reason }) {
    const r = await pool.query(
        `INSERT INTO order_returns (order_row_id, user_id, reason) VALUES ($1, $2, $3) RETURNING *`,
        [orderRowId, userId, reason],
    );
    const row = mapRow(r.rows[0]);
    row.order_row_id = r.rows[0].order_row_id;
    return row;
}

// return model: findReturnsByUser reads and returns records.
export async function findReturnsByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM order_returns WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return mapRows(r.rows);
}

// return model: findAllReturns reads and returns records.
export async function findAllReturns() {
    const r = await pool.query(`SELECT * FROM order_returns ORDER BY created_at DESC`);
    return mapRows(r.rows);
}

// return model: findReturnById reads and returns records.
export async function findReturnById(id) {
    const r = await pool.query(`SELECT * FROM order_returns WHERE id = $1`, [pickId(id)]);
    const row = r.rows[0];
    if (!row) return null;
    return { ...mapRow(row), order_row_id: row.order_row_id };
}

// return model: updateReturnStatus updates existing records.
export async function updateReturnStatus(id, status, adminNote) {
    const r = await pool.query(
        `UPDATE order_returns SET status = $1, admin_note = COALESCE($2, admin_note), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [status, adminNote, id],
    );
    const row = r.rows[0];
    if (!row) return null;
    return { ...mapRow(row), order_row_id: row.order_row_id };
}

