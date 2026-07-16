/**
 * Push notifications — device registry + send stub (FCM later).
 */
import pool from '../../config/connectDB.js';
import { pickId, mapRow, mapRows } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';

// Register/update one push token for a user device.
export async function registerDeviceToken({ userId, token, platform = 'unknown', provider = 'fcm' }) {
    const r = await pool.query(
        `INSERT INTO device_tokens (user_id, token, platform, provider, last_seen_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, token) DO UPDATE SET
            platform = EXCLUDED.platform,
            provider = EXCLUDED.provider,
            last_seen_at = NOW()
         RETURNING *`,
        [pickId(userId), String(token), platform, provider],
    );
    return mapRow(r.rows[0]);
}

// Remove one device token when user logs out or uninstalls.
export async function unregisterDeviceToken(userId, token) {
    await pool.query(`DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`, [
        pickId(userId),
        String(token),
    ]);
    return { ok: true };
}

// List registered push-capable devices for a user.
export async function listDeviceTokens(userId) {
    const r = await pool.query(
        `SELECT id, platform, provider, last_seen_at, created_at FROM device_tokens WHERE user_id = $1`,
        [pickId(userId)],
    );
    return mapRows(r.rows);
}

/**
 * Send push — stubs until FCM credentials are configured.
 * Always writes push_notification_log.
 */
export async function sendPushToUser(userId, { title, body, payload = {} }) {
    // Gate push delivery by feature flag for controlled rollout.
    if (!(await isEnabled('push_notifications'))) {
        return { skipped: true, reason: 'feature_disabled' };
    }

    const tokens = await pool.query(`SELECT * FROM device_tokens WHERE user_id = $1`, [
        pickId(userId),
    ]);
    if (!tokens.rows.length) {
        return { sent: 0, reason: 'no_devices' };
    }

    // Stub provider (mirror Stripe refund stub)
    // Write stubbed send logs while FCM credentials are not configured.
    if (!process.env.FCM_SERVER_KEY && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const results = [];
        for (const d of tokens.rows) {
            const log = await pool.query(
                `INSERT INTO push_notification_log (
                    user_id, device_token_id, title, body, payload, provider, status, error
                 ) VALUES ($1,$2,$3,$4,$5::jsonb,'fcm','stubbed',$6) RETURNING id`,
                [
                    pickId(userId),
                    d.id,
                    title || '',
                    body || '',
                    JSON.stringify(payload),
                    'FCM not configured — set FCM_SERVER_KEY later',
                ],
            );
            results.push({ deviceTokenId: d.id, logId: log.rows[0].id, status: 'stubbed' });
        }
        return { sent: 0, stubbed: results.length, results };
    }

    // Real FCM wiring goes here later
    const err = new Error('FCM send path not implemented yet');
    err.status = 501;
    err.code = 'FCM_NOT_IMPLEMENTED';
    throw err;
}
