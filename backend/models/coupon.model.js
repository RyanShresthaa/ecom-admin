/**
 * PostgreSQL: `coupons` — lookup, create, atomic increment, delete.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

export async function findCouponByCode(code) {
    const r = await pool.query(
        `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true`,
        [String(code).trim()],
    );
    const row = r.rows[0];
    if (!row) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
    if (row.max_uses != null && row.used_count >= row.max_uses) return null;
    return mapRow(row);
}

export async function findAllCoupons() {
    const r = await pool.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
    return mapRows(r.rows);
}

export async function createCoupon(data) {
    const r = await pool.query(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_amt, max_uses, expires_at, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            String(data.code).trim().toUpperCase(),
            data.discount_type,
            data.discount_value,
            data.min_order_amt ?? 0,
            data.max_uses ?? null,
            data.expires_at ?? null,
            data.active !== false,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function incrementCouponUse(code) {
    await pool.query(
        `UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE UPPER(code) = UPPER($1)`,
        [code],
    );
}

/** Atomically consume one coupon use inside an open transaction (checks max_uses / expiry). */
export async function incrementCouponUseInTransaction(client, code) {
    const r = await client.query(
        `UPDATE coupons
         SET used_count = used_count + 1, updated_at = NOW()
         WHERE UPPER(code) = UPPER($1)
           AND active = true
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR used_count < max_uses)
         RETURNING id`,
        [String(code).trim()],
    );
    if (r.rowCount === 0) {
        throw new Error('Coupon is no longer valid');
    }
}

export async function deleteCoupon(id) {
    await pool.query(`DELETE FROM coupons WHERE id = $1`, [id]);
}

export async function updateCoupon(id, data) {
    const current = await pool.query(`SELECT * FROM coupons WHERE id = $1`, [id]);
    if (!current.rows[0]) return null;
    const row = current.rows[0];
    const code =
        data.code != null ? String(data.code).trim().toUpperCase() : row.code;
    const discount_type = data.discount_type ?? row.discount_type;
    const discount_value =
        data.discount_value != null ? data.discount_value : row.discount_value;
    const min_order_amt =
        data.min_order_amt != null ? data.min_order_amt : row.min_order_amt;
    const max_uses = data.max_uses !== undefined ? data.max_uses : row.max_uses;
    const expires_at = data.expires_at !== undefined ? data.expires_at : row.expires_at;
    const active = data.active !== undefined ? data.active !== false : row.active;

    const r = await pool.query(
        `UPDATE coupons SET
            code = $1,
            discount_type = $2,
            discount_value = $3,
            min_order_amt = $4,
            max_uses = $5,
            expires_at = $6,
            active = $7,
            updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [code, discount_type, discount_value, min_order_amt ?? 0, max_uses, expires_at, active, id],
    );
    return mapRow(r.rows[0]);
}
