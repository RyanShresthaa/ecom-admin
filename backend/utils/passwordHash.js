/**
 * Configurable bcrypt hashing (BCRYPT_COST, safe range 10–15) with Prometheus timing.
 * Rehash-on-login when stored cost is below the configured cost.
 */
import bcrypt from 'bcrypt';
import {
    bcryptCompareDuration,
    bcryptHashDuration,
    authPasswordRehashes,
} from '../config/metrics.js';

export const BCRYPT_COST_MIN = 10;
export const BCRYPT_COST_MAX = 15;
export const BCRYPT_COST_DEFAULT = 10;

/** bcrypt hash cost segment: $2a$10$... → 10 */
const COST_RE = /^\$2[aby]\$(\d{2})\$/;

/**
 * Resolve and validate BCRYPT_COST from env.
 * @throws {Error} when set but outside 10–15 or not an integer
 */
export function getBcryptCost() {
    const raw = process.env.BCRYPT_COST;
    if (raw == null || String(raw).trim() === '') {
        return BCRYPT_COST_DEFAULT;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < BCRYPT_COST_MIN || n > BCRYPT_COST_MAX) {
        throw new Error(
            `BCRYPT_COST must be an integer between ${BCRYPT_COST_MIN} and ${BCRYPT_COST_MAX} (got ${JSON.stringify(raw)})`,
        );
    }
    return n;
}

/** Soft validation for startup — returns error string or null */
export function validateBcryptCostEnv() {
    try {
        getBcryptCost();
        return null;
    } catch (err) {
        return err.message;
    }
}

export function parseBcryptCostFromHash(hash) {
    if (!hash || typeof hash !== 'string') return null;
    const m = COST_RE.exec(hash);
    if (!m) return null;
    return Number(m[1]);
}

export function needsRehash(hash, targetCost = getBcryptCost()) {
    const current = parseBcryptCostFromHash(hash);
    if (current == null) return true;
    return current < targetCost;
}

export async function hashPassword(plain) {
    const cost = getBcryptCost();
    const end = bcryptHashDuration.startTimer({ cost: String(cost) });
    try {
        return await bcrypt.hash(String(plain), cost);
    } finally {
        end();
    }
}

export async function comparePassword(plain, hash) {
    const cost = parseBcryptCostFromHash(hash);
    const end = bcryptCompareDuration.startTimer({
        cost: cost != null ? String(cost) : 'unknown',
    });
    try {
        return await bcrypt.compare(String(plain), String(hash));
    } finally {
        end();
    }
}

/**
 * After a successful password verify, upgrade hash if cost is below configured BCRYPT_COST.
 * Failures are swallowed so login is never blocked by rehash errors.
 */
export async function rehashPasswordIfNeeded(userId, plainPassword, currentHash, updateUserFn) {
    try {
        if (!needsRehash(currentHash)) return false;
        const next = await hashPassword(plainPassword);
        await updateUserFn(userId, { password: next });
        authPasswordRehashes.inc({ from_cost: String(parseBcryptCostFromHash(currentHash) ?? 'unknown') });
        return true;
    } catch {
        return false;
    }
}
