// idempotency model: handles idempotency table/entity CRUD and query helpers.
/**
 * PostgreSQL: `checkout_idempotency` — replay same checkout response for `Idempotency-Key`.
 */
import pool from '../config/connectDB.js';

// idempotency model: findIdempotency reads and returns records.
export async function findIdempotency(userId, key) {
    const r = await pool.query(
        `SELECT status, response_body, http_status, created_at
         FROM checkout_idempotency
         WHERE user_id = $1 AND idempotency_key = $2 AND expires_at > NOW()`,
        [userId, key],
    );
    return r.rows[0] || null;
}

// idempotency model: tryStartIdempotency creates a new record.
export async function tryStartIdempotency(userId, key) {
    try {
        await pool.query(
            `INSERT INTO checkout_idempotency (user_id, idempotency_key, status)
             VALUES ($1, $2, 'processing')`,
            [userId, key],
        );
        return { started: true };
    } catch (e) {
        if (e.code !== '23505') throw e;
        const existing = await findIdempotency(userId, key);
        if (!existing) return { started: false, reason: 'unknown' };
        if (existing.status === 'completed') {
            return {
                started: false,
                reason: 'completed',
                response_body: existing.response_body,
                http_status: existing.http_status ?? 200,
            };
        }
        const ageMs = Date.now() - new Date(existing.created_at).getTime();
        if (ageMs < 120_000) {
            return { started: false, reason: 'processing' };
        }
        await pool.query(
            `UPDATE checkout_idempotency
             SET status = 'processing', response_body = NULL, http_status = 200, created_at = NOW(),
                 expires_at = NOW() + INTERVAL '24 hours'
             WHERE user_id = $1 AND idempotency_key = $2`,
            [userId, key],
        );
        return { started: true, reclaimed: true };
    }
}

// idempotency model: completeIdempotency updates existing records.
export async function completeIdempotency(userId, key, httpStatus, responseBody) {
    await pool.query(
        `UPDATE checkout_idempotency
         SET status = 'completed', http_status = $3, response_body = $4::jsonb
         WHERE user_id = $1 AND idempotency_key = $2`,
        [userId, key, httpStatus, JSON.stringify(responseBody)],
    );
}

// idempotency model: failIdempotency updates existing records.
export async function failIdempotency(userId, key) {
    await pool.query(
        `DELETE FROM checkout_idempotency WHERE user_id = $1 AND idempotency_key = $2 AND status = 'processing'`,
        [userId, key],
    );
}

