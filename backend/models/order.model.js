/**
 * PostgreSQL: `orders` — insert/list/update, revenue helpers, `mapOrder`.
 */
import pool from '../config/connectDB.js';
import { mapRow, pickId } from '../utils/sql.js';
import { findAddressById } from './address.model.js';

export function mapOrder(row) {
    if (!row) return null;
    const o = mapRow(row);
    o.userId = o.user_id;
    o.orderId = o.order_id;
    o.productId = o.product_id;
    o.product_details = row.product_details || {};
    o.paymentId = o.payment_id;
    o.subTotalAmt = Number(o.sub_total_amt);
    o.totalAmt = Number(o.total_amt);
    o.quantity = row.quantity ?? o.product_details?.quantity ?? 1;
    o.unitPrice = Number(row.unit_price ?? 0);
    o.lineTotal = Number(row.line_total ?? 0);
    o.taxAmt = Number(row.tax_amt ?? 0);
    o.shippingAmt = Number(row.shipping_amt ?? 0);
    o.couponCode = row.coupon_code;
    o.couponDiscount = Number(row.coupon_discount ?? 0);
    o.invoiceReceipt = row.invoice_receipt;
    return o;
}

async function attachAddress(order) {
    if (!order?.delivery_address) return order;
    const addr = await findAddressById(pickId(order.delivery_address));
    return { ...order, delivery_address: addr };
}

export async function insertOrders(rows) {
    const created = [];
    for (const row of rows) {
        const r = await pool.query(
            `INSERT INTO orders (
                user_id, order_id, product_id, product_details, payment_id, payment_status,
                delivery_status, delivery_address, sub_total_amt, total_amt, total_amount,
                shipping_address, status
             )
             VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $10, $11, $12) RETURNING *`,
            [
                row.userId,
                row.orderId,
                pickId(row.productId),
                JSON.stringify(row.product_details || {}),
                row.paymentId || '',
                row.payment_status || '',
                row.delivery_status || '',
                pickId(row.delivery_address),
                row.subTotalAmt ?? row.sub_total_amt ?? 0,
                row.totalAmt ?? row.total_amt ?? 0,
                String(pickId(row.delivery_address) || ''),
                'pending',
            ],
        );
        created.push(mapOrder(r.rows[0]));
    }
    return created;
}

export async function findOrdersByUser(userId, { limit = 100, skip = 0 } = {}) {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const safeSkip = Math.max(0, Number(skip) || 0);
    const r = await pool.query(
        `SELECT o.*,
                CASE WHEN a.id IS NULL THEN NULL ELSE row_to_json(a.*) END AS address_row
         FROM orders o
         LEFT JOIN addresses a ON a.id = o.delivery_address
         WHERE o.user_id = $1
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, safeLimit, safeSkip],
    );
    return r.rows.map((row) => {
        const order = mapOrder(row);
        if (row.address_row) {
            order.delivery_address = mapRow(row.address_row);
        }
        return order;
    });
}

export async function findAllOrders({ limit = 100, skip = 0 } = {}) {
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
    const safeSkip = Math.max(0, Number(skip) || 0);
    const r = await pool.query(
        `SELECT o.*,
                CASE WHEN a.id IS NULL THEN NULL ELSE row_to_json(a.*) END AS address_row
         FROM orders o
         LEFT JOIN addresses a ON a.id = o.delivery_address
         ORDER BY o.created_at DESC
         LIMIT $1 OFFSET $2`,
        [safeLimit, safeSkip],
    );
    return r.rows.map((row) => {
        const order = mapOrder(row);
        if (row.address_row) {
            order.delivery_address = mapRow(row.address_row);
        }
        return order;
    });
}

/** Lightweight recent order lines for admin notifications (no address N+1). */
export async function findRecentOrderLines(limit = 50) {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const r = await pool.query(
        `SELECT id, order_id, user_id, line_total, total_amt, created_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT $1`,
        [safeLimit],
    );
    return r.rows.map(mapOrder);
}

export async function findOrderById(id) {
    const r = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
    return mapOrder(r.rows[0]);
}

/** All order line rows sharing the same logical `order_id` (one checkout). */
export async function findOrdersByOrderGroupId(orderIdStr) {
    const r = await pool.query(`SELECT * FROM orders WHERE order_id = $1 ORDER BY id`, [orderIdStr]);
    return Promise.all(r.rows.map((row) => attachAddress(mapOrder(row))));
}

export async function updateOrder(id, data) {
    const r = await pool.query(
        `UPDATE orders SET
            delivery_status = COALESCE($1, delivery_status),
            payment_status = COALESCE($2, payment_status),
            updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [data.delivery_status, data.payment_status, id],
    );
    return mapOrder(r.rows[0]);
}

/** Update every line that shares a checkout `order_id`. */
export async function updateOrdersByOrderGroupId(orderIdStr, data) {
    const r = await pool.query(
        `UPDATE orders SET
            delivery_status = COALESCE($1, delivery_status),
            payment_status = COALESCE($2, payment_status),
            updated_at = NOW()
         WHERE order_id = $3
         RETURNING *`,
        [data.delivery_status, data.payment_status, orderIdStr],
    );
    return r.rows.map(mapOrder);
}

export async function updateOrdersPayment(orderIds, paymentId, userId) {
    await pool.query(
        `UPDATE orders SET payment_id = $1, payment_status = 'paid', updated_at = NOW()
         WHERE id = ANY($2::int[]) AND user_id = $3`,
        [paymentId, orderIds.map(pickId), userId],
    );
}

export async function countOrders() {
    const r = await pool.query(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(order_id, ''), 'row-' || id::text))::int AS c FROM orders`,
    );
    return r.rows[0].c;
}

/** Sum line totals excluding cancelled (avoids inflating dashboard revenue). */
export async function sumRevenue() {
    const r = await pool.query(
        `SELECT COALESCE(SUM(line_total), 0)::float AS total
         FROM orders
         WHERE LOWER(COALESCE(delivery_status, '')) <> 'cancelled'`,
    );
    return r.rows[0].total;
}
