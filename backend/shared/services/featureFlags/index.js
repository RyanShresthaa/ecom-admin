/**
 * Feature flags — gate scale features without redeploying.
 */
import pool from '../../config/connectDB.js';
import { mapRow, mapRows } from '../../utils/sql.js';

const cache = new Map(); // key → { enabled, expires }
const TTL_MS = 5000;

// List all feature flags for admin and diagnostics APIs.
export async function listFlags() {
    const r = await pool.query(`SELECT * FROM feature_flags ORDER BY key`);
    return mapRows(r.rows);
}

// Resolve one flag value with short-lived in-memory caching.
export async function getFlag(key) {
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expires > now) return hit.enabled;

    const r = await pool.query(`SELECT enabled FROM feature_flags WHERE key = $1`, [key]);
    const enabled = Boolean(r.rows[0]?.enabled);
    cache.set(key, { enabled, expires: now + TTL_MS });
    return enabled;
}

// Alias helper used by other services for readable checks.
export async function isEnabled(key) {
    return getFlag(key);
}

// Upsert feature flag state and invalidate local cache entry.
export async function setFlag(key, enabled, { description, meta } = {}) {
    const r = await pool.query(
        `INSERT INTO feature_flags (key, enabled, description, meta, updated_at)
         VALUES ($1, $2, COALESCE($3, ''), COALESCE($4::jsonb, '{}'::jsonb), NOW())
         ON CONFLICT (key) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            description = CASE WHEN $3 IS NULL THEN feature_flags.description ELSE EXCLUDED.description END,
            meta = CASE WHEN $4 IS NULL THEN feature_flags.meta ELSE EXCLUDED.meta END,
            updated_at = NOW()
         RETURNING *`,
        [key, Boolean(enabled), description ?? null, meta != null ? JSON.stringify(meta) : null],
    );
    cache.delete(key);
    return mapRow(r.rows[0]);
}

// Clear all cached feature flag values for tests/admin actions.
export function clearFlagCache() {
    cache.clear();
}
