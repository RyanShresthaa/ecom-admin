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
    o.stockRestored = Boolean(row.stock_restored);
    return o;
}

/** Lines that should not count toward revenue / LTV. */
export const REVENUE_EXCLUDE_SQL = `(
  delivery_status ILIKE 'returned'
  OR delivery_status ILIKE 'cancel%'
  OR payment_status ILIKE 'refunded'
)`;

async function attachAddress(order) {
    if (!order?.delivery_address) return order;
    const addr = await findAddressById(pickId(order.delivery_address));
    return { ...order, delivery_address: addr };
}

/** Batch-load addresses (2 queries max) instead of 1 per order line. */
async function attachAddressesMany(orders) {
    if (!orders?.length) return [];
    const ids = [
        ...new Set(
            orders
                .map((o) => pickId(typeof o.delivery_address === 'object' ? o.delivery_address?.id : o.delivery_address))
                .filter(Boolean),
        ),
    ];
    if (!ids.length) return orders;
    const r = await pool.query(`SELECT * FROM addresses WHERE id = ANY($1::int[])`, [ids]);
    const byId = new Map(r.rows.map((row) => [row.id, mapRow(row)]));
    return orders.map((o) => {
        const aid = pickId(typeof o.delivery_address === 'object' ? o.delivery_address?.id : o.delivery_address);
        if (!aid) return o;
        return { ...o, delivery_address: byId.get(aid) || o.delivery_address };
    });
}

const ORDER_GROUP_KEY = `COALESCE(NULLIF(TRIM(order_id), ''), 'row-' || id::text)`;

export async function insertOrders(rows) {
    const created = [];
    for (const row of rows) {
        const r = await pool.query(
            `INSERT INTO orders (user_id, order_id, product_id, product_details, payment_id, payment_status, delivery_status, delivery_address, sub_total_amt, total_amt)
             VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10) RETURNING *`,
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
            ],
        );
        created.push(mapOrder(r.rows[0]));
    }
    return created;
}

export async function findOrdersByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return attachAddressesMany(r.rows.map(mapOrder));
}

export async function findAllOrders({ includeAddress = true } = {}) {
    const r = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
    const mapped = r.rows.map(mapOrder);
    if (!includeAddress) return mapped;
    return attachAddressesMany(mapped);
}

/**
 * Paginated admin order groups (one row per checkout / order_id).
 * Avoids downloading every line + N+1 addresses for the Orders table.
 */
export async function findAdminOrderGroups({
    page = 1,
    limit = 10,
    search = '',
    deliveryStatus = '',
    paymentStatus = '',
    dateFrom = '',
    dateTo = '',
    userId = null,
} = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (safePage - 1) * safeLimit;
    const params = [];
    const filters = [];

    if (userId) {
        params.push(pickId(userId));
        filters.push(`g.user_id = $${params.length}`);
    }
    if (deliveryStatus && deliveryStatus !== 'all') {
        params.push(deliveryStatus);
        filters.push(`g.delivery_status ILIKE $${params.length}`);
    }
    if (paymentStatus && paymentStatus !== 'all') {
        params.push(paymentStatus);
        filters.push(`g.payment_status ILIKE $${params.length}`);
    }
    if (dateFrom) {
        params.push(dateFrom);
        filters.push(`g.created_at::date >= $${params.length}::date`);
    }
    if (dateTo) {
        params.push(dateTo);
        filters.push(`g.created_at::date <= $${params.length}::date`);
    }
    if (search) {
        params.push(`%${String(search).trim()}%`);
        const i = params.length;
        filters.push(
            `(g.order_key ILIKE $${i} OR COALESCE(u.name, '') ILIKE $${i} OR COALESCE(u.email, '') ILIKE $${i})`,
        );
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const countParams = [...params];
    params.push(safeLimit, offset);
    const lim = params.length - 1;
    const off = params.length;

    const base = `
      WITH grouped AS (
        SELECT
          ${ORDER_GROUP_KEY} AS order_key,
          MAX(user_id) AS user_id,
          (ARRAY_AGG(delivery_status ORDER BY id DESC))[1] AS delivery_status,
          (ARRAY_AGG(payment_status ORDER BY id DESC))[1] AS payment_status,
          MAX(total_amt)::float AS total_amt,
          MAX(created_at) AS created_at,
          ARRAY_AGG(id ORDER BY id) AS line_ids,
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'productId', product_id,
              'name', COALESCE(product_details->>'name', product_details->>'title', 'Item'),
              'quantity', COALESCE(quantity, 1),
              'price', COALESCE(unit_price, 0)
            ) ORDER BY id
          ) AS items
        FROM orders
        GROUP BY ${ORDER_GROUP_KEY}
      )
    `;

    const countSql = `
      ${base}
      SELECT COUNT(*)::int AS c
      FROM grouped g
      LEFT JOIN users u ON u.id = g.user_id
      ${where}
    `;
    const dataSql = `
      ${base}
      SELECT
        g.order_key,
        g.user_id,
        g.delivery_status,
        g.payment_status,
        g.total_amt,
        g.created_at,
        g.line_ids,
        g.items,
        u.name AS customer_name,
        u.email AS customer_email
      FROM grouped g
      LEFT JOIN users u ON u.id = g.user_id
      ${where}
      ORDER BY g.created_at DESC NULLS LAST
      LIMIT $${lim} OFFSET $${off}
    `;

    const [countRes, dataRes] = await Promise.all([
        pool.query(countSql, countParams),
        pool.query(dataSql, params),
    ]);

    const data = dataRes.rows.map((row) => ({
        id: row.order_key,
        lineIds: row.line_ids || [],
        customerId: String(row.user_id || ''),
        customerName: row.customer_name || row.customer_email || `User ${row.user_id || ''}`.trim(),
        customerEmail: row.customer_email || '',
        deliveryStatus: row.delivery_status || 'Pending',
        paymentStatus: row.payment_status || '',
        totalAmount: Number(row.total_amt || 0),
        date: row.created_at,
        items: Array.isArray(row.items) ? row.items.map((it) => ({
            id: String(it.id),
            productId: String(it.productId || ''),
            name: it.name || 'Item',
            quantity: Number(it.quantity || 1),
            price: Number(it.price || 0),
        })) : [],
        notes: [],
    }));

    return {
        data,
        totalCount: countRes.rows[0]?.c || 0,
        page: safePage,
        limit: safeLimit,
    };
}

/** Order lines for one product (analytics) — avoids /order/all. */
export async function findOrderLinesByProductId(productId, { limit = 500 } = {}) {
    const pid = pickId(productId);
    if (!pid) return [];
    const r = await pool.query(
        `SELECT * FROM orders WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [pid, Math.min(2000, Math.max(1, Number(limit) || 500))],
    );
    return r.rows.map(mapOrder);
}

/** Per-user order counts + spend for customers table. */
export async function findUserOrderStats() {
    const r = await pool.query(
        `SELECT
           user_id,
           COUNT(DISTINCT ${ORDER_GROUP_KEY})::int AS order_count,
           COALESCE(SUM(CASE WHEN NOT ${REVENUE_EXCLUDE_SQL} THEN line_total ELSE 0 END), 0)::float AS lifetime_value
         FROM orders
         WHERE user_id IS NOT NULL
         GROUP BY user_id`,
    );
    return r.rows.map((row) => ({
        userId: row.user_id,
        orderCount: Number(row.order_count || 0),
        lifetimeValue: Number(row.lifetime_value || 0),
    }));
}

/** Last N days of revenue (by line_total) for dashboard chart. */
export async function findSalesSeries(days = 14) {
    const safeDays = Math.min(90, Math.max(1, Number(days) || 14));
    const r = await pool.query(
        `SELECT
           created_at::date AS day,
           COALESCE(SUM(CASE WHEN NOT ${REVENUE_EXCLUDE_SQL} THEN line_total ELSE 0 END), 0)::float AS revenue,
           COUNT(DISTINCT ${ORDER_GROUP_KEY}) FILTER (WHERE NOT ${REVENUE_EXCLUDE_SQL})::int AS orders
         FROM orders
         WHERE created_at >= (CURRENT_DATE - ($1::int - 1))
         GROUP BY created_at::date
         ORDER BY day ASC`,
        [safeDays],
    );
    return r.rows.map((row) => ({
        date: String(row.day).slice(0, 10),
        revenue: Number(row.revenue || 0),
        orders: Number(row.orders || 0),
    }));
}

export async function findOrderById(id) {
    const r = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
    return mapOrder(r.rows[0]);
}

/** All order line rows sharing the same logical `order_id` (one checkout). */
export async function findOrdersByOrderGroupId(orderIdStr) {
    const key = String(orderIdStr || '');
    let r;
    if (key.startsWith('row-')) {
        const id = pickId(key.slice(4));
        r = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
    } else {
        r = await pool.query(`SELECT * FROM orders WHERE order_id = $1 ORDER BY id`, [key]);
    }
    return attachAddressesMany(r.rows.map(mapOrder));
}

export async function updateOrder(id, data) {
    const r = await pool.query(
        `UPDATE orders SET
            delivery_status = COALESCE($1, delivery_status),
            payment_status = COALESCE($2, payment_status),
            stock_restored = CASE
              WHEN $3::boolean IS NULL THEN stock_restored
              ELSE $3::boolean
            END,
            updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [
            data.delivery_status ?? null,
            data.payment_status ?? null,
            data.stock_restored === undefined ? null : Boolean(data.stock_restored),
            id,
        ],
    );
    return mapOrder(r.rows[0]);
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

/** Sum line totals (avoids double-counting repeated order-level total_amt on multi-item orders). */
export async function sumRevenue() {
    const r = await pool.query(
        `SELECT COALESCE(SUM(line_total), 0)::float AS total
         FROM orders
         WHERE NOT ${REVENUE_EXCLUDE_SQL}`,
    );
    return r.rows[0].total;
}
