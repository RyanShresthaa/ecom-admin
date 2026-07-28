/**
 * Admin notifications + global search + sales analytics series.
 */
import {
    buildAdminNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../models/adminNotification.model.js';
import { findProducts } from '../models/product.model.js';
import pool from '../config/connectDB.js';

export async function listAdminNotificationsController(req, res) {
    try {
        const data = await buildAdminNotifications(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function markNotificationReadController(req, res) {
    try {
        const id = req.body?.id ?? req.params?.id;
        if (!id) {
            return res.status(400).json({ message: 'id required', error: true, success: false });
        }
        await markNotificationRead(req.userId, id);
        const data = await buildAdminNotifications(req.userId);
        return res.json({ message: 'Marked read', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function markAllNotificationsReadController(req, res) {
    try {
        const data = await markAllNotificationsRead(req.userId);
        return res.json({ message: 'All marked read', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

/** GET /api/admin/search?q=&limit=5 */
export async function adminSearchController(req, res) {
    try {
        const q = String(req.query.q || '').trim();
        const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
        if (q.length < 2) {
            return res.json({
                data: { products: [], orders: [], customers: [] },
                error: false,
                success: true,
            });
        }

        const like = `%${q}%`;
        const [productsRes, ordersRes, usersRes] = await Promise.all([
            findProducts({ search: q, limit, skip: 0 }),
            pool.query(
                `SELECT DISTINCT ON (order_id) order_id, total_amt, created_at, user_id
                 FROM orders
                 WHERE order_id ILIKE $1
                 ORDER BY order_id, created_at DESC
                 LIMIT $2`,
                [like, limit],
            ),
            pool.query(
                `SELECT id, name, email FROM users
                 WHERE name ILIKE $1 OR email ILIKE $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [like, limit],
            ),
        ]);

        const products = (productsRes.data || []).slice(0, limit).map((p) => ({
            id: String(p.id),
            label: p.name,
            sublabel: p.sku || `ID ${p.id}`,
            href: `/products?q=${encodeURIComponent(p.name)}`,
        }));

        const orders = ordersRes.rows.map((row) => ({
            id: String(row.order_id),
            label: row.order_id,
            sublabel: `Total ${Number(row.total_amt || 0).toFixed(2)}`,
            href: `/orders?q=${encodeURIComponent(row.order_id)}`,
        }));

        const customers = usersRes.rows.map((u) => ({
            id: String(u.id),
            label: u.name || u.email,
            sublabel: u.email,
            href: `/sellers?q=${encodeURIComponent(u.email || u.name || '')}`,
        }));

        return res.json({
            data: { products, orders, customers },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

/** GET /api/admin/sales-series?days=14 — revenue in stored order amounts (NPR catalog base). */
export async function salesSeriesController(req, res) {
    try {
        const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));
        const r = await pool.query(
            `WITH days AS (
               SELECT generate_series(
                 (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
                 CURRENT_DATE,
                 '1 day'::interval
               )::date AS d
             ),
             daily AS (
               SELECT
                 (created_at AT TIME ZONE 'UTC')::date AS d,
                 COALESCE(SUM(COALESCE(NULLIF(line_total, 0), total_amt)), 0)::float AS revenue,
                 COUNT(DISTINCT COALESCE(NULLIF(order_id, ''), 'row-' || id::text))::int AS orders
               FROM orders
               WHERE created_at >= (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')
                 AND LOWER(COALESCE(delivery_status, '')) <> 'cancelled'
               GROUP BY 1
             )
             SELECT
               to_char(days.d, 'Mon DD') AS date,
               days.d AS date_key,
               COALESCE(daily.revenue, 0)::float AS revenue,
               COALESCE(daily.orders, 0)::int AS orders
             FROM days
             LEFT JOIN daily ON daily.d = days.d
             ORDER BY days.d ASC`,
            [days],
        );
        return res.json({
            data: r.rows.map((row) => ({
                date: row.date,
                dateKey: row.date_key,
                revenue: Number(row.revenue) || 0,
                orders: Number(row.orders) || 0,
            })),
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
