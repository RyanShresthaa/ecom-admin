/**
 * Loyalty points — earn on paid/COD orders, redeem against balance.
 */
import pool from '../../config/connectDB.js';
import { pickId, mapRow, mapRows } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import { getShopSettingsMap } from '../../models/settings.model.js';

// Ensure every user has a loyalty account row before updates.
async function ensureAccount(userId, client = pool) {
    await client.query(
        `INSERT INTO loyalty_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [pickId(userId)],
    );
}

// Get loyalty balance and lifetime points for a user.
export async function getLoyaltyAccount(userId) {
    await ensureAccount(userId);
    const r = await pool.query(`SELECT * FROM loyalty_accounts WHERE user_id = $1`, [pickId(userId)]);
    const row = mapRow(r.rows[0]);
    return {
        userId: row.user_id,
        pointsBalance: Number(row.points_balance),
        lifetimeEarned: Number(row.lifetime_earned),
        updatedAt: row.updated_at,
    };
}

// List latest loyalty ledger entries for a user timeline.
export async function listLoyaltyLedger(userId, { limit = 50 } = {}) {
    const r = await pool.query(
        `SELECT * FROM loyalty_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT $2`,
        [pickId(userId), Math.min(200, limit)],
    );
    return mapRows(r.rows);
}

// Apply a ledger delta atomically and persist resulting balance.
async function applyDelta(userId, delta, reason, { orderId, meta } = {}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureAccount(userId, client);
        const locked = await client.query(
            `SELECT * FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE`,
            [pickId(userId)],
        );
        const bal = Number(locked.rows[0].points_balance);
        const next = bal + delta;
        if (next < 0) {
            const err = new Error('Insufficient loyalty points');
            err.status = 400;
            throw err;
        }
        const lifetime =
            delta > 0
                ? Number(locked.rows[0].lifetime_earned) + delta
                : Number(locked.rows[0].lifetime_earned);
        await client.query(
            `UPDATE loyalty_accounts SET points_balance = $1, lifetime_earned = $2, updated_at = NOW()
             WHERE user_id = $3`,
            [next, lifetime, pickId(userId)],
        );
        await client.query(
            `INSERT INTO loyalty_ledger (user_id, delta, balance_after, reason, order_id, meta)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            [
                pickId(userId),
                delta,
                next,
                reason,
                orderId || null,
                JSON.stringify(meta || {}),
            ],
        );
        await client.query('COMMIT');
        return { pointsBalance: next, delta };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/** Call after successful checkout when loyalty_points flag is on. */
export async function earnPointsForOrder(userId, orderTotal, orderId) {
    if (!(await isEnabled('loyalty_points'))) return null;
    const settings = await getShopSettingsMap();
    const per = Number(settings.loyalty_earn_per_currency_unit ?? 1);
    const points = Math.floor(Number(orderTotal) * per);
    if (points <= 0) return null;
    return applyDelta(userId, points, 'earn', { orderId, meta: { orderTotal } });
}

export async function redeemPoints(userId, points, { orderId } = {}) {
    if (!(await isEnabled('loyalty_points'))) {
        const err = new Error('Loyalty feature is disabled');
        err.status = 403;
        throw err;
    }
    const n = Math.floor(Number(points));
    if (!(n > 0)) {
        const err = new Error('points must be positive');
        err.status = 400;
        throw err;
    }
    const settings = await getShopSettingsMap();
    const valuePerPoint = Number(settings.loyalty_redeem_value ?? 0.01);
    const result = await applyDelta(userId, -n, 'redeem', {
        orderId,
        meta: { currencyValue: Number((n * valuePerPoint).toFixed(2)) },
    });
    return {
        ...result,
        currencyValue: Number((n * valuePerPoint).toFixed(2)),
        valuePerPoint,
    };
}

// Apply staff/admin manual loyalty correction entries.
export async function adjustPoints(userId, delta, reason = 'adjust') {
    return applyDelta(userId, Math.trunc(Number(delta)), reason);
}
