/**
 * Marketplace seller earnings + payouts.
 * Gated by feature flag `seller_payouts`.
 */
import pool from '../../config/connectDB.js';
import { pickId, mapRow, mapRows } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import { findProductOwner } from '../../models/product.model.js';

// Resolve seller-specific or global commission rate percentage.
export async function getCommissionRate(sellerId) {
    const sid = pickId(sellerId);
    if (sid) {
        const r = await pool.query(
            `SELECT rate_percent FROM seller_commission_rules
             WHERE seller_id = $1 AND active = true LIMIT 1`,
            [sid],
        );
        if (r.rows[0]) return Number(r.rows[0].rate_percent);
    }
    const g = await pool.query(
        `SELECT rate_percent FROM seller_commission_rules
         WHERE seller_id IS NULL AND active = true LIMIT 1`,
    );
    return Number(g.rows[0]?.rate_percent ?? 10);
}

/** Record earnings for each order line after successful checkout. */
export async function recordEarningsForOrderRows(rows, currency = 'NPR') {
    if (!(await isEnabled('seller_payouts'))) return [];
    const created = [];
    for (const row of rows) {
        const productId = pickId(row.product_id || row.productId);
        const owner = await findProductOwner(productId);
        if (!owner?.seller_id) continue;
        const gross = Number(row.line_total ?? row.lineTotal ?? 0);
        const rate = await getCommissionRate(owner.seller_id);
        const commission = Number(((gross * rate) / 100).toFixed(2));
        const net = Number((gross - commission).toFixed(2));
        const r = await pool.query(
            `INSERT INTO seller_earnings (
                seller_id, order_row_id, order_id, gross_amt, commission_amt, net_amt, currency, status
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,'available') RETURNING *`,
            [
                owner.seller_id,
                pickId(row.id),
                row.order_id || row.orderId || '',
                gross,
                commission,
                net,
                currency,
            ],
        );
        created.push(mapRow(r.rows[0]));
    }
    return created;
}

export async function getSellerBalance(sellerId) {
    const r = await pool.query(
        `SELECT
            COALESCE(SUM(CASE WHEN status = 'available' THEN net_amt ELSE 0 END), 0)::float AS available,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amt ELSE 0 END), 0)::float AS pending,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amt ELSE 0 END), 0)::float AS paid
         FROM seller_earnings WHERE seller_id = $1`,
        [pickId(sellerId)],
    );
    return r.rows[0];
}

// List recent earnings rows for seller payout history.
export async function listSellerEarnings(sellerId, { limit = 50 } = {}) {
    const r = await pool.query(
        `SELECT * FROM seller_earnings WHERE seller_id = $1 ORDER BY id DESC LIMIT $2`,
        [pickId(sellerId), Math.min(200, limit)],
    );
    return mapRows(r.rows);
}

/**
 * Manual payout — marks available earnings paid and creates payout row.
 * Stripe Connect stub later via provider field.
 */
export async function createSellerPayout({
    sellerId,
    amount,
    currency = 'NPR',
    createdByUserId,
    provider = 'manual',
}) {
    // Validate feature flag and available balance before payout write.
    if (!(await isEnabled('seller_payouts'))) {
        const err = new Error('Seller payouts feature is disabled');
        err.status = 403;
        throw err;
    }
    const bal = await getSellerBalance(sellerId);
    const amt = Number(amount);
    if (!(amt > 0) || amt > Number(bal.available) + 0.001) {
        const err = new Error(`Payout exceeds available balance (${bal.available})`);
        err.status = 400;
        throw err;
    }

    const client = await pool.connect();
    try {
        // Create payout and atomically mark covered earnings as paid.
        await client.query('BEGIN');
        const payout = await client.query(
            `INSERT INTO seller_payouts (
                seller_id, amount, currency, provider, status, created_by_user_id
             ) VALUES ($1,$2,$3,$4,'completed',$5) RETURNING *`,
            [pickId(sellerId), amt, currency, provider, createdByUserId || null],
        );

        // Mark oldest available earnings as paid until amount covered
        let left = amt;
        const earn = await client.query(
            `SELECT * FROM seller_earnings
             WHERE seller_id = $1 AND status = 'available'
             ORDER BY id ASC FOR UPDATE`,
            [pickId(sellerId)],
        );
        for (const row of earn.rows) {
            if (left <= 0) break;
            const net = Number(row.net_amt);
            if (net <= left + 0.001) {
                await client.query(
                    `UPDATE seller_earnings SET status = 'paid' WHERE id = $1`,
                    [row.id],
                );
                left = Number((left - net).toFixed(2));
            }
        }
        await client.query('COMMIT');
        return mapRow(payout.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// List payout records generated for a seller.
export async function listSellerPayouts(sellerId, { limit = 50 } = {}) {
    const r = await pool.query(
        `SELECT * FROM seller_payouts WHERE seller_id = $1 ORDER BY id DESC LIMIT $2`,
        [pickId(sellerId), Math.min(200, limit)],
    );
    return mapRows(r.rows);
}
