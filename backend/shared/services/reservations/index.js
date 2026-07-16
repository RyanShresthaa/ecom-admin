/**
 * Multi-warehouse stock reservations — hold qty during checkout, then commit/release.
 * Gated by feature flag `stock_reservations`.
 */
import pool from '../../config/connectDB.js';
import { pickId, mapRow, mapRows } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import { getDefaultWarehouseId } from '../../models/inventory.model.js';

const DEFAULT_TTL_MIN = 15;

// Reserve warehouse stock for checkout to prevent oversell.
export async function reserveStock({
    userId,
    productId,
    quantity,
    variantId = null,
    warehouseId = null,
    checkoutKey = null,
    ttlMinutes = DEFAULT_TTL_MIN,
}) {
    // Feature gate stock reservation flow for phased rollout.
    if (!(await isEnabled('stock_reservations'))) {
        return { skipped: true, reason: 'feature_disabled' };
    }
    const qty = Math.max(1, Number(quantity));
    const wh = warehouseId || (await getDefaultWarehouseId());
    if (!wh) {
        const err = new Error('Default warehouse is not configured');
        err.status = 500;
        throw err;
    }

    const client = await pool.connect();
    try {
        // Lock stock row and increment reserved quantity atomically.
        await client.query('BEGIN');
        const locked = await client.query(
            `SELECT quantity, reserved_quantity FROM warehouse_stock
             WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
            [wh, pickId(productId)],
        );
        const row = locked.rows[0];
        const onHand = Number(row?.quantity || 0);
        const reserved = Number(row?.reserved_quantity || 0);
        const available = onHand - reserved;
        if (available < qty) {
            const err = new Error(`Only ${available} available to reserve`);
            err.status = 400;
            throw err;
        }
        if (!row) {
            await client.query(
                `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reserved_quantity)
                 VALUES ($1, $2, 0, $3)`,
                [wh, pickId(productId), qty],
            );
        } else {
            await client.query(
                `UPDATE warehouse_stock SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
                 WHERE warehouse_id = $2 AND product_id = $3`,
                [qty, wh, pickId(productId)],
            );
        }
        const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
        const ins = await client.query(
            `INSERT INTO stock_reservations (
                warehouse_id, product_id, variant_id, quantity, user_id, checkout_key, expires_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                wh,
                pickId(productId),
                pickId(variantId) || null,
                qty,
                userId || null,
                checkoutKey || null,
                expires,
            ],
        );
        await client.query('COMMIT');
        return mapRow(ins.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// Release an active reservation and return reserved quantity to availability.
export async function releaseReservation(reservationId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const r = await client.query(
            `SELECT * FROM stock_reservations WHERE id = $1 FOR UPDATE`,
            [pickId(reservationId)],
        );
        const row = r.rows[0];
        if (!row || row.status !== 'active') {
            await client.query('COMMIT');
            return { released: false };
        }
        await client.query(
            `UPDATE warehouse_stock
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
             WHERE warehouse_id = $2 AND product_id = $3`,
            [row.quantity, row.warehouse_id, row.product_id],
        );
        await client.query(
            `UPDATE stock_reservations SET status = 'released' WHERE id = $1`,
            [row.id],
        );
        await client.query('COMMIT');
        return { released: true };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/** Convert active reservation into committed (stock already decremented on place). */
// Commit reservation against an order and clear reserved quantity.
export async function commitReservation(reservationId, orderId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const r = await client.query(
            `SELECT * FROM stock_reservations WHERE id = $1 FOR UPDATE`,
            [pickId(reservationId)],
        );
        const row = r.rows[0];
        if (!row || row.status !== 'active') {
            await client.query('COMMIT');
            return { committed: false };
        }
        // Reservation becomes sale: clear reserved, quantity already reduced by decrementStock
        // or reduce reserved only (quantity drop happens in placeOrder).
        await client.query(
            `UPDATE warehouse_stock
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
             WHERE warehouse_id = $2 AND product_id = $3`,
            [row.quantity, row.warehouse_id, row.product_id],
        );
        await client.query(
            `UPDATE stock_reservations SET status = 'committed', order_id = $1 WHERE id = $2`,
            [orderId || null, row.id],
        );
        await client.query('COMMIT');
        return { committed: true };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// Sweep and expire stale active reservations past their TTL.
export async function expireStaleReservations() {
    if (!(await isEnabled('stock_reservations'))) return { expired: 0 };
    const r = await pool.query(
        `SELECT id FROM stock_reservations WHERE status = 'active' AND expires_at < NOW()`,
    );
    let n = 0;
    for (const row of r.rows) {
        await releaseReservation(row.id);
        await pool.query(`UPDATE stock_reservations SET status = 'expired' WHERE id = $1`, [row.id]);
        n += 1;
    }
    return { expired: n };
}

// List a user's latest reservation rows for checkout recovery.
export async function listReservationsForUser(userId) {
    const r = await pool.query(
        `SELECT * FROM stock_reservations WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
        [pickId(userId)],
    );
    return mapRows(r.rows);
}
