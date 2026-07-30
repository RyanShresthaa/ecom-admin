/**
 * PostgreSQL: `payment_methods` — verified card/bank metadata (last4 only).
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

export async function createPaymentMethod(data) {
    if (data.is_default) {
        await pool.query(`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, [
            data.userId,
        ]);
    }
    const r = await pool.query(
        `INSERT INTO payment_methods (
            user_id, type, brand, last4, exp_month, exp_year,
            bank_name, account_type, billing_name, billing_zip, routing_last4, is_default
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
            data.userId,
            data.type,
            data.brand || null,
            data.last4,
            data.exp_month ?? null,
            data.exp_year ?? null,
            data.bank_name || null,
            data.account_type || null,
            data.billing_name || null,
            data.billing_zip || null,
            data.routing_last4 || null,
            Boolean(data.is_default),
        ],
    );
    return mapRow(r.rows[0]);
}

export async function findPaymentMethodsByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
        [userId],
    );
    return mapRows(r.rows);
}

export async function deletePaymentMethod(id, userId) {
    const r = await pool.query(
        `DELETE FROM payment_methods WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId],
    );
    return r.rowCount > 0;
}

export async function setDefaultPaymentMethod(id, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const found = await client.query(
            `SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2`,
            [id, userId],
        );
        if (!found.rowCount) {
            await client.query('ROLLBACK');
            return null;
        }
        await client.query(`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, [
            userId,
        ]);
        const r = await client.query(
            `UPDATE payment_methods SET is_default = true, updated_at = NOW()
             WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId],
        );
        await client.query('COMMIT');
        return mapRow(r.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
