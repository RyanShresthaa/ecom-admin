/**
 * Idempotency-Key header for checkout: dedupe responses for 24h via idempotency table.
 */
import {
    tryStartIdempotency,
    completeIdempotency,
    failIdempotency,
} from '../models/idempotency.model.js';

const KEY_MAX = 128;

/**
 * Wrap checkout so duplicate Idempotency-Key returns the same response (24h).
 * Header: Idempotency-Key (UUID recommended). Optional — checkout works without it.
 */
// Guard checkout execution with idempotency token and replay-safe response handling.
export async function withCheckoutIdempotency(req, runCheckout) {
    const key = String(req.headers['idempotency-key'] || '').trim();
    if (!key) {
        return { status: 200, body: await runCheckout() };
    }
    if (key.length > KEY_MAX) {
        const err = new Error('Idempotency-Key must be at most 128 characters');
        err.status = 400;
        throw err;
    }

    const userId = req.userId;
    const start = await tryStartIdempotency(userId, key);
    if (!start.started) {
        if (start.reason === 'completed') {
            return { status: start.http_status ?? 200, body: start.response_body, replayed: true };
        }
        if (start.reason === 'processing') {
            const err = new Error('Checkout already in progress for this Idempotency-Key');
            err.status = 409;
            throw err;
        }
    }

    try {
        const body = await runCheckout();
        await completeIdempotency(userId, key, 200, body);
        return { status: 200, body };
    } catch (e) {
        await failIdempotency(userId, key);
        throw e;
    }
}
