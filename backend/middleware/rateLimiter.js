/**
 * express-rate-limit + slow-down presets.
 * Env overrides: RATE_LIMIT_API, RATE_LIMIT_LOGIN, RATE_LIMIT_ADMIN_READ, etc.
 * Troubleshooting 429: docs/README.md
 *
 * Keying:
 * - Public / pre-auth limiters → IP (via ipKeyGenerator)
 * - Post-auth limiters → user:<id> when req.userId is set (must run after `auth`)
 *
 * Store: Redis when REDIS_URL is set (cluster-safe); otherwise memory.
 * Call initRateLimiters() after initRateLimitStore() before listen.
 *
 * Non-prod bypass: E2E_RELAX_RATE_LIMIT=true or LOAD_TEST_BYPASS=1 (ignored in production).
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { getRateLimitStore } from './rateLimitStore.js';
import { logger } from '../utils/logger.js';

const json429 = (message) => (_req, res) => {
    res.status(429).json({ message, error: true, success: false });
};

const WIN_15M = 15 * 60 * 1000;
const WIN_1H = 60 * 60 * 1000;

/**
 * Non-production only: skip rate limits for Playwright / load audits.
 * Never honor these flags when NODE_ENV=production.
 */
export function e2eOrLoadTestBypass(_req) {
    if (process.env.NODE_ENV === 'production') return false;
    return (
        process.env.LOAD_TEST_BYPASS === '1' ||
        String(process.env.E2E_RELAX_RATE_LIMIT || '').toLowerCase() === 'true'
    );
}

/** IP key for unauthenticated / public surfaces (IPv6-safe). */
function ipKey(req) {
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
}

/**
 * Prefer authenticated user id; fall back to IP.
 * Place these limiters AFTER `auth` so `req.userId` is set.
 */
function userOrIpKey(req) {
    if (req.userId != null && String(req.userId).length > 0) {
        return `user:${req.userId}`;
    }
    return ipKey(req);
}

function withStore(opts) {
    const store = getRateLimitStore();
    return store ? { ...opts, store } : opts;
}

/**
 * Placeholder middleware swapped by initRateLimiters() after the store is ready.
 * Avoids express-rate-limit ERR_ERL_CREATED_IN_REQUEST_HANDLER.
 * Short-circuits E2E/load-test bypass before the real limiter (reliable even if skip misbehaves).
 */
function deferredLimiter(name) {
    const mw = (req, res, next) => {
        if (e2eOrLoadTestBypass(req)) return next();
        if (!mw._impl) {
            return next(new Error(`Rate limiter "${name}" used before initRateLimiters()`));
        }
        return mw._impl(req, res, next);
    };
    mw._impl = null;
    return mw;
}

function buildLimit(opts) {
    return rateLimit(
        withStore({
            windowMs: WIN_15M,
            standardHeaders: true,
            legacyHeaders: false,
            validate: { creationStack: false },
            ...opts,
            // Keep last so opts cannot clear the bypass
            skip: e2eOrLoadTestBypass,
        }),
    );
}

/** Progressive delay after many requests (abuse) — memory window (soft throttle). */
const _speedLimiterImpl = slowDown({
    windowMs: WIN_15M,
    delayAfter: Number(process.env.SLOW_DOWN_AFTER || 80),
    delayMs: (hits) => Math.min(hits * 50, 3000),
    validate: { delayMs: false },
    skip: e2eOrLoadTestBypass,
});

export const speedLimiter = (req, res, next) => {
    if (e2eOrLoadTestBypass(req)) return next();
    return _speedLimiterImpl(req, res, next);
};

export const apiLimiter = deferredLimiter('api');
export const loginLimiter = deferredLimiter('login');
export const registerLimiter = deferredLimiter('register');
export const refreshLimiter = deferredLimiter('refresh');
export const authLimiter = loginLimiter;
export const passwordResetLimiter = deferredLimiter('passwordReset');
export const verifyEmailLimiter = deferredLimiter('verifyEmail');
export const adminReadLimiter = deferredLimiter('adminRead');
export const adminWriteLimiter = deferredLimiter('adminWrite');
export const adminSensitiveLimiter = deferredLimiter('adminSensitive');
export const adminLimiter = adminReadLimiter;
export const uploadLimiter = deferredLimiter('upload');
export const contactLimiter = deferredLimiter('contact');
export const searchLimiter = deferredLimiter('search');
export const analyticsLimiter = deferredLimiter('analytics');

/** Bind real limiters once Redis/memory store is ready (call from server start). */
export function initRateLimiters() {
    if (e2eOrLoadTestBypass()) {
        logger.info('Rate limits relaxed (E2E_RELAX_RATE_LIMIT or LOAD_TEST_BYPASS)');
    }

    apiLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_API || 300),
        keyGenerator: ipKey,
        handler: json429('Too many requests. Try again later.'),
    });

    loginLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_LOGIN || process.env.RATE_LIMIT_AUTH || 10),
        keyGenerator: ipKey,
        handler: json429('Too many login attempts. Try again later.'),
    });

    registerLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_REGISTER || 5),
        keyGenerator: ipKey,
        handler: json429('Too many registration attempts. Try again later.'),
    });

    refreshLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_REFRESH || 60),
        keyGenerator: ipKey,
        handler: json429('Too many token refresh attempts. Try again later.'),
    });

    passwordResetLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_PASSWORD || 5),
        keyGenerator: ipKey,
        handler: json429('Too many reset attempts. Try again later.'),
    });

    verifyEmailLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_VERIFY_EMAIL || 10),
        keyGenerator: ipKey,
        handler: json429('Too many verification attempts. Try again later.'),
    });

    adminReadLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_ADMIN_READ || process.env.RATE_LIMIT_ADMIN || 300),
        keyGenerator: userOrIpKey,
        handler: json429('Too many admin read requests. Try again later.'),
    });

    adminWriteLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_ADMIN_WRITE || 80),
        keyGenerator: userOrIpKey,
        handler: json429('Too many admin write requests. Try again later.'),
    });

    adminSensitiveLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_ADMIN_SENSITIVE || 15),
        keyGenerator: userOrIpKey,
        handler: json429('Too many sensitive admin actions. Try again later.'),
    });

    uploadLimiter._impl = buildLimit({
        windowMs: WIN_1H,
        limit: Number(process.env.RATE_LIMIT_UPLOAD || 40),
        keyGenerator: userOrIpKey,
        handler: json429('Too many uploads. Try again later.'),
    });

    contactLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_CONTACT || 5),
        keyGenerator: ipKey,
        handler: json429('Too many submissions. Try again later.'),
    });

    searchLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_SEARCH || 60),
        keyGenerator: ipKey,
        handler: json429('Too many search requests. Try again later.'),
    });

    analyticsLimiter._impl = buildLimit({
        limit: Number(process.env.RATE_LIMIT_ANALYTICS || 30),
        keyGenerator: ipKey,
        handler: json429('Too many analytics events. Try again later.'),
    });
}
