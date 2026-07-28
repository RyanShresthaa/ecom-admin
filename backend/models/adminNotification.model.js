/**
 * Admin notifications — derived from recent orders + low stock,
 * with per-admin read state in `admin_notification_reads`.
 */
import pool from '../config/connectDB.js';
import { findRecentOrderLines } from './order.model.js';
import { findProducts } from './product.model.js';
import { getShopSettingsMap } from './settings.model.js';

async function loadReadKeys(adminUserId) {
    const r = await pool.query(
        `SELECT notification_key FROM admin_notification_reads WHERE admin_user_id = $1`,
        [adminUserId],
    );
    return new Set(r.rows.map((row) => row.notification_key));
}

function groupOrders(lines) {
    const map = new Map();
    for (const line of lines || []) {
        const oid = String(line.orderId ?? line.order_id ?? line.id);
        if (!map.has(oid)) {
            map.set(oid, {
                id: oid,
                customerName: 'Customer',
                totalAmount: 0,
                createdAt: line.createdAt ?? line.created_at,
            });
        }
        const g = map.get(oid);
        g.totalAmount += Number(line.lineTotal ?? line.line_total ?? line.totalAmt ?? line.total_amt ?? 0);
        const ts = line.createdAt ?? line.created_at;
        if (ts && (!g.createdAt || new Date(ts) > new Date(g.createdAt))) g.createdAt = ts;
    }
    return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Build notification list for an admin (stable keys for read tracking). */
export async function buildAdminNotifications(adminUserId) {
    const settings = await getShopSettingsMap();
    const threshold = Number(settings.low_stock_threshold ?? 15);
    const [orderLines, productPage] = await Promise.all([
        findRecentOrderLines(50),
        findProducts({ limit: 50, skip: 0, published: true }),
    ]);
    const products = Array.isArray(productPage) ? productPage : productPage?.data || [];
    const groups = groupOrders(orderLines);
    const notifications = [];
    const now = Date.now();

    for (const order of groups.slice(0, 5)) {
        const key = `order:${order.id}`;
        notifications.push({
            id: key,
            title: 'New order received',
            body: `Order ${order.id} — ${Number(order.totalAmount || 0).toFixed(2)}`,
            type: 'order',
            href: `/orders?q=${encodeURIComponent(order.id)}`,
            createdAt:
                order.createdAt ||
                new Date(now - notifications.length * 15 * 60 * 1000).toISOString(),
        });
    }

    const low = products
        .filter((p) => Number(p.stock ?? 0) < threshold && p.publish !== false)
        .slice(0, 5);
    for (const p of low) {
        const pid = p.id ?? p._id;
        notifications.push({
            id: `stock:${pid}`,
            title: 'Low stock alert',
            body: `${p.name} is below threshold (${Number(p.stock ?? 0)} left, min ${threshold})`,
            type: 'inventory',
            href: `/inventory?q=${encodeURIComponent(p.name || '')}`,
            createdAt: new Date(now - (notifications.length + 1) * 30 * 60 * 1000).toISOString(),
        });
    }

    if (!notifications.length) {
        notifications.push({
            id: 'system:welcome',
            title: 'Admin dashboard connected',
            body: 'You are viewing live data from the backend API.',
            type: 'system',
            href: '/',
            createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
        });
    }

    const readKeys = await loadReadKeys(adminUserId);
    return notifications.map((n) => ({
        ...n,
        read: readKeys.has(String(n.id)),
    }));
}

export async function markNotificationRead(adminUserId, notificationKey) {
    await pool.query(
        `INSERT INTO admin_notification_reads (admin_user_id, notification_key)
         VALUES ($1, $2)
         ON CONFLICT (admin_user_id, notification_key) DO UPDATE SET read_at = NOW()`,
        [adminUserId, String(notificationKey)],
    );
}

export async function markAllNotificationsRead(adminUserId) {
    const list = await buildAdminNotifications(adminUserId);
    if (list.length) {
        const values = [];
        const placeholders = list
            .map((n, i) => {
                values.push(adminUserId, String(n.id));
                const base = i * 2;
                return `($${base + 1}, $${base + 2})`;
            })
            .join(', ');
        await pool.query(
            `INSERT INTO admin_notification_reads (admin_user_id, notification_key)
             VALUES ${placeholders}
             ON CONFLICT (admin_user_id, notification_key) DO UPDATE SET read_at = NOW()`,
            values,
        );
    }
    return buildAdminNotifications(adminUserId);
}
