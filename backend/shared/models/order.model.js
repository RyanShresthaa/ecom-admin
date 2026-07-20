// order model: handles order table/entity CRUD and query helpers.
/**
 * PostgreSQL: `orders` — insert/list/update, revenue helpers, `mapOrder`.
 */
import pool from '../config/connectDB.js';
import { mapRow, pickId } from '../utils/sql.js';
import { findAddressById } from './address.model.js';

// order model: mapOrder reads and returns records.
export function mapOrder(row) {
    if (!row) return null;
    const o = mapRow(row);
    o.userId = o.user_id;
    o.orderId = o.order_id;
    o.productId = o.product_id;
    o.variantId = o.variant_id || row.variant_id || null;
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
    o.trackingNumber = row.tracking_number || null;
    o.carrier = row.carrier || null;
    o.shippedAt = row.shipped_at || null;
    o.deliveredAt = row.delivered_at || null;
    o.expectedDeliveryAt = row.expected_delivery_at || null;
    return o;
}

/** Lines that should not count toward revenue / LTV. */
export const REVENUE_EXCLUDE_SQL = `(
  delivery_status ILIKE 'returned'
  OR delivery_status ILIKE 'cancel%'
  OR payment_status ILIKE 'refunded'
)`;

// order model: attachAddress builds enriched response data.
async function attachAddress(order) {
    if (!order?.delivery_address) return order;
    const addr = await findAddressById(pickId(order.delivery_address));
    return { ...order, delivery_address: addr };
}

/** Batch-load addresses (2 queries max) instead of 1 per order line. */
// order model: attachAddressesMany builds enriched response data.
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

// order model: insertOrders creates a new record.
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

// order model: findOrdersByUser reads and returns records.
export async function findOrdersByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
    );
    return attachAddressesMany(r.rows.map(mapOrder));
}

// order model: findAllOrders reads and returns records.
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
// order model: findAdminOrderGroups reads and returns records.
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
          (ARRAY_AGG(payment_id ORDER BY id DESC))[1] AS payment_id,
          (ARRAY_AGG(expected_delivery_at ORDER BY id DESC))[1] AS expected_delivery_at,
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
        g.payment_id,
        g.expected_delivery_at,
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
        paymentId: row.payment_id || '',
        expectedDeliveryAt: row.expected_delivery_at || null,
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
// order model: findOrderLinesByProductId reads and returns records.
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
// order model: findUserOrderStats reads and returns records.
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

/** Order stats for a subset of users (paginated customer list). */
export async function findUserOrderStatsForIds(userIds) {
    const ids = (Array.isArray(userIds) ? userIds : []).map((id) => Number(id)).filter(Boolean);
    if (!ids.length) return [];
    const r = await pool.query(
        `SELECT
           user_id,
           COUNT(DISTINCT ${ORDER_GROUP_KEY})::int AS order_count,
           COALESCE(SUM(CASE WHEN NOT ${REVENUE_EXCLUDE_SQL} THEN line_total ELSE 0 END), 0)::float AS lifetime_value
         FROM orders
         WHERE user_id = ANY($1::int[])
         GROUP BY user_id`,
        [ids],
    );
    return r.rows.map((row) => ({
        userId: row.user_id,
        orderCount: Number(row.order_count || 0),
        lifetimeValue: Number(row.lifetime_value || 0),
    }));
}

/** Last N days of revenue (by line_total) for dashboard chart. */
// order model: findSalesSeries reads and returns records.
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
    const byDay = new Map(
        r.rows.map((row) => [
            String(row.day).slice(0, 10),
            {
                revenue: Number(row.revenue || 0),
                orders: Number(row.orders || 0),
            },
        ]),
    );
    const series = [];
    for (let i = safeDays - 1; i >= 0; i -= 1) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const point = byDay.get(key) || { revenue: 0, orders: 0 };
        const { revenue, orders } = point;
        series.push({
            date: key,
            revenue,
            orders,
            itemsSold: 0,
            avgOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
        });
    }
    return series;
}

// order model: findOrderById reads and returns records.
export async function findOrderById(id) {
    const r = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
    return mapOrder(r.rows[0]);
}

/** All order line rows sharing the same logical `order_id` (one checkout). */
// order model: findOrdersByOrderGroupId reads and returns records.
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

// order model: updateOrder updates existing records.
export async function updateOrder(id, data) {
    const r = await pool.query(
        `UPDATE orders SET
            delivery_status = COALESCE($1, delivery_status),
            payment_status = COALESCE($2, payment_status),
            stock_restored = CASE
              WHEN $3::boolean IS NULL THEN stock_restored
              ELSE $3::boolean
            END,
            tracking_number = CASE WHEN $4::boolean THEN $5 ELSE tracking_number END,
            carrier = CASE WHEN $6::boolean THEN $7 ELSE carrier END,
            shipped_at = COALESCE($8::timestamptz, shipped_at),
            delivered_at = COALESCE($9::timestamptz, delivered_at),
            expected_delivery_at = CASE
              WHEN $10::boolean THEN $11::timestamptz
              ELSE expected_delivery_at
            END,
            updated_at = NOW()
         WHERE id = $12 RETURNING *`,
        [
            data.delivery_status ?? null,
            data.payment_status ?? null,
            data.stock_restored === undefined ? null : Boolean(data.stock_restored),
            data.tracking_number !== undefined,
            data.tracking_number !== undefined ? data.tracking_number : null,
            data.carrier !== undefined,
            data.carrier !== undefined ? data.carrier : null,
            data.shipped_at ?? null,
            data.delivered_at ?? null,
            data.expected_delivery_at !== undefined,
            data.expected_delivery_at !== undefined ? data.expected_delivery_at : null,
            id,
        ],
    );
    return mapOrder(r.rows[0]);
}

/** Patch fulfillment fields only (tracking / timestamps). */
// order model: updateOrderFulfillment updates existing records.
export async function updateOrderFulfillment(id, data) {
    return updateOrder(id, {
        tracking_number: data.tracking_number,
        carrier: data.carrier,
        shipped_at: data.shipped_at,
        delivered_at: data.delivered_at,
        expected_delivery_at: data.expected_delivery_at,
        delivery_status: data.delivery_status,
        payment_status: data.payment_status,
        stock_restored: data.stock_restored,
    });
}

// order model: updateOrdersPayment updates existing records.
export async function updateOrdersPayment(orderIds, paymentId, userId) {
    await pool.query(
        `UPDATE orders SET payment_id = $1, payment_status = 'paid', updated_at = NOW()
         WHERE id = ANY($2::int[]) AND user_id = $3`,
        [paymentId, orderIds.map(pickId), userId],
    );
}

/** First order line with this payment_id (used to prevent double Stripe fulfillment). */
// order model: findOrdersByPaymentId reads and returns records.
export async function findOrdersByPaymentId(paymentId) {
    const key = String(paymentId || '').trim();
    if (!key) return [];
    const r = await pool.query(`SELECT * FROM orders WHERE payment_id = $1 ORDER BY id LIMIT 50`, [key]);
    return attachAddressesMany(r.rows.map(mapOrder));
}

// order model: countOrders reads and returns records.
export async function countOrders() {
    const r = await pool.query(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(order_id, ''), 'row-' || id::text))::int AS c FROM orders`,
    );
    return r.rows[0].c;
}

/** Sum line totals (avoids double-counting repeated order-level total_amt on multi-item orders). */
// order model: sumRevenue reads and returns records.
export async function sumRevenue() {
    const r = await pool.query(
        `SELECT COALESCE(SUM(line_total), 0)::float AS total
         FROM orders
         WHERE NOT ${REVENUE_EXCLUDE_SQL}`,
    );
    return r.rows[0].total;
}

/**
 * Per-product sold / refunded qty for admin products table.
 * Sold = units on non-returned/cancelled/refunded lines; refunded = the rest.
 */
// order model: findProductSalesMetricsByIds aggregates sold/refunded quantities.
export async function findProductSalesMetricsByIds(productIds = []) {
    const ids = [...new Set(productIds.map(pickId).filter(Boolean))];
    if (!ids.length) return new Map();

    const r = await pool.query(
        `SELECT
           product_id,
           COALESCE(SUM(
             CASE WHEN NOT ${REVENUE_EXCLUDE_SQL}
               THEN COALESCE(quantity, 1)
               ELSE 0
             END
           ), 0)::int AS sold_qty,
           COALESCE(SUM(
             CASE WHEN ${REVENUE_EXCLUDE_SQL}
               THEN COALESCE(quantity, 1)
               ELSE 0
             END
           ), 0)::int AS refunded_qty
         FROM orders
         WHERE product_id = ANY($1::int[])
         GROUP BY product_id`,
        [ids],
    );

    const map = new Map();
    for (const row of r.rows) {
        map.set(String(row.product_id), {
            soldQty: Number(row.sold_qty || 0),
            refundedQty: Number(row.refunded_qty || 0),
        });
    }
    return map;
}

