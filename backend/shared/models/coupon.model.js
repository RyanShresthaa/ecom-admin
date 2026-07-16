// coupon model: handles coupon table/entity CRUD and query helpers.
/**
 * PostgreSQL: `coupons` — lookup, create, atomic increment, delete.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

// coupon model: findCouponByCode reads and returns records.
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

// coupon model: findAllCoupons reads and returns records.
export async function findAllCoupons() {
    const r = await pool.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
    return mapRows(r.rows);
}

// coupon model: createCoupon creates a new record.
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

// coupon model: incrementCouponUse updates existing records.
export async function incrementCouponUse(code) {
    await pool.query(
        `UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE UPPER(code) = UPPER($1)`,
        [code],
    );
}

/** Atomically consume one coupon use inside an open transaction (checks max_uses / expiry). */
// coupon model: incrementCouponUseInTransaction updates existing records.
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

// coupon model: deleteCoupon deletes matching records.
export async function deleteCoupon(id) {
    await pool.query(`DELETE FROM coupons WHERE id = $1`, [id]);
}

