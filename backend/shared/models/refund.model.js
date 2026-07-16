// refund model: handles refund table/entity CRUD and query helpers.
/**
 * PostgreSQL: `payment_refunds` — ledger of full/partial refunds per order line.
 * Phase 1 records offline (manual) refunds only; Stripe ids can be stored later.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

// refund model: mapRefund reads and returns records.
export function mapRefund(row) {
    if (!row) return null;
    const r = mapRow(row);
    r.orderRowId = r.order_row_id;
    r.orderId = r.order_id;
    r.userId = r.user_id;
    r.providerRefundId = r.provider_refund_id;
    r.stockRestored = Boolean(r.stock_restored);
    r.creditNoteId = r.credit_note_id;
    r.orderReturnId = r.order_return_id;
    r.createdByUserId = r.created_by_user_id;
    r.amount = Number(r.amount);
    return r;
}

/** Sum of completed refunds for one order line. */
// refund model: sumCompletedRefundsForOrderRow reads and returns records.
export async function sumCompletedRefundsForOrderRow(orderRowId) {
    const r = await pool.query(
        `SELECT COALESCE(SUM(amount), 0)::float AS total
         FROM payment_refunds
         WHERE order_row_id = $1 AND status = 'completed'`,
        [pickId(orderRowId)],
    );
    return Number(r.rows[0]?.total || 0);
}

// refund model: findRefundsByOrderRowId reads and returns records.
export async function findRefundsByOrderRowId(orderRowId) {
    const r = await pool.query(
        `SELECT * FROM payment_refunds WHERE order_row_id = $1 ORDER BY id ASC`,
        [pickId(orderRowId)],
    );
    return mapRows(r.rows).map(mapRefund);
}

// refund model: findRefundById reads and returns records.
export async function findRefundById(id) {
    const r = await pool.query(`SELECT * FROM payment_refunds WHERE id = $1`, [pickId(id)]);
    return mapRefund(r.rows[0]);
}

// refund model: listRefunds reads and returns records.
export async function listRefunds({ orderRowId, orderId, limit = 50, skip = 0 } = {}) {
    const params = [];
    const filters = [];
    if (orderRowId) {
        params.push(pickId(orderRowId));
        filters.push(`order_row_id = $${params.length}`);
    }
    if (orderId) {
        params.push(String(orderId));
        filters.push(`order_id = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    params.push(Math.min(200, Number(limit) || 50), Number(skip) || 0);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT * FROM payment_refunds ${where} ORDER BY id DESC LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows).map(mapRefund);
}

/**
 * Insert a refund row. Pass an optional pg `client` for transactional use.
 */
// refund model: insertRefund creates a new record.
export async function insertRefund(data, client = pool) {
    const r = await client.query(
        `INSERT INTO payment_refunds (
            order_row_id, order_id, user_id, amount, currency, reason,
            provider, provider_refund_id, status, stock_restored,
            credit_note_id, order_return_id, created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
            pickId(data.orderRowId),
            data.orderId || '',
            data.userId || null,
            Number(data.amount),
            data.currency || 'NPR',
            data.reason || '',
            data.provider || 'manual',
            data.providerRefundId || null,
            data.status || 'completed',
            Boolean(data.stockRestored),
            data.creditNoteId || null,
            data.orderReturnId || null,
            data.createdByUserId || null,
        ],
    );
    return mapRefund(r.rows[0]);
}

// refund model: attachCreditNoteToRefund builds enriched response data.
export async function attachCreditNoteToRefund(refundId, creditNoteId, client = pool) {
    const r = await client.query(
        `UPDATE payment_refunds SET credit_note_id = $1 WHERE id = $2 RETURNING *`,
        [pickId(creditNoteId), pickId(refundId)],
    );
    return mapRefund(r.rows[0]);
}

