/**
 * PostgreSQL: `push_subscriptions`
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

export async function upsertPushSubscription({ userId, endpoint, p256dh, auth, userAgent }) {
    const r = await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (endpoint) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = NOW()
         RETURNING *`,
        [userId, endpoint, p256dh, auth, userAgent || null],
    );
    return mapRow(r.rows[0]);
}

export async function deletePushSubscriptionByEndpoint(userId, endpoint) {
    await pool.query(
        `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        [userId, endpoint],
    );
}

export async function deletePushSubscriptionById(id) {
    await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [id]);
}

export async function findPushSubscriptionsByUser(userId) {
    const r = await pool.query(
        `SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId],
    );
    return r.rows.map(mapRow);
}

export async function deleteAllPushSubscriptionsForUser(userId) {
    await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
}
