/**
 * PostgreSQL: pending_checkouts — Stripe Checkout payloads until paid.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

export async function createPendingCheckout({
    userId,
    addressId,
    couponCode,
    listItems,
    stripeSessionId = null,
}) {
    const r = await pool.query(
        `INSERT INTO pending_checkouts (user_id, address_id, coupon_code, list_items, stripe_session_id, status)
         VALUES ($1, $2, $3, $4::jsonb, $5, 'pending')
         RETURNING *`,
        [
            userId,
            addressId,
            couponCode || null,
            JSON.stringify(listItems || []),
            stripeSessionId,
        ],
    );
    return mapPending(r.rows[0]);
}

export async function setPendingStripeSession(id, stripeSessionId) {
    const r = await pool.query(
        `UPDATE pending_checkouts
         SET stripe_session_id = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, stripeSessionId],
    );
    return mapPending(r.rows[0]);
}

export async function findPendingById(id) {
    const r = await pool.query(`SELECT * FROM pending_checkouts WHERE id = $1`, [id]);
    return mapPending(r.rows[0]);
}

export async function findPendingBySessionId(sessionId) {
    const r = await pool.query(
        `SELECT * FROM pending_checkouts WHERE stripe_session_id = $1`,
        [sessionId],
    );
    return mapPending(r.rows[0]);
}

export async function markPendingCompleted(id, orderGroupId) {
    const r = await pool.query(
        `UPDATE pending_checkouts
         SET status = 'completed', order_group_id = $2, updated_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'processing')
         RETURNING *`,
        [id, orderGroupId],
    );
    return mapPending(r.rows[0]);
}

/**
 * Atomically claim a pending checkout for finalize (Stripe webhook vs confirm race).
 * Winner gets status=processing; loser gets null and should re-read completed state.
 */
export async function claimPendingForFinalize(id) {
    const r = await pool.query(
        `UPDATE pending_checkouts
         SET status = 'processing', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id],
    );
    return mapPending(r.rows[0]);
}

export async function releasePendingClaim(id, status = 'failed') {
    const r = await pool.query(
        `UPDATE pending_checkouts
         SET status = $2, updated_at = NOW()
         WHERE id = $1 AND status = 'processing'
         RETURNING *`,
        [id, status],
    );
    return mapPending(r.rows[0]);
}

function mapPending(row) {
    if (!row) return null;
    const base = mapRow(row);
    return {
        ...base,
        userId: row.user_id,
        addressId: row.address_id,
        couponCode: row.coupon_code,
        listItems: row.list_items || [],
        stripeSessionId: row.stripe_session_id,
        orderGroupId: row.order_group_id,
        status: row.status,
    };
}
