/**
 * express-rate-limit + slow-down presets (API, auth, admin, upload, password, verify-email).
 * Phase 5: shared Redis store when REDIS_URL is connected (HybridRateLimitStore).
 */
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { HybridRateLimitStore } from './redisRateLimitStore.js';

const json429 = (message) => (_req, res) => {
    // Standardize rate-limit rejection payload across route groups.
    res.status(429).json({ message, error: true, success: false });
};

function store(prefix) {
    // Namespace counters by limiter type (api/auth/admin/upload/etc).
    return new HybridRateLimitStore({ prefix: `ecom:rl:${prefix}:` });
}

// Progressive slowdown after sustained traffic — adds delay before hard 429 limits kick in.
/** Progressive delay after many requests (abuse) */
export const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: Number(process.env.SLOW_DOWN_AFTER || 80),
    delayMs: (hits) => Math.min(hits * 50, 3000),
    validate: { delayMs: false },
});

// Global API rate limit — 300 req/15min per IP (Redis-backed when available).
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_API || 300),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('api'),
    handler: json429('Too many requests. Try again later.'),
});

// Auth endpoints limiter — login/register/refresh brute-force protection.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_AUTH || 30),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('auth'),
    handler: json429('Too many attempts. Try again later.'),
});

// Password reset limiter — caps forgot-password OTP spam per IP.
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PASSWORD || 5),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('password'),
    handler: json429('Too many reset attempts. Try again later.'),
});

// Email verification limiter — caps verify-email token attempts per IP.
/** Email verification token attempts */
export const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_VERIFY_EMAIL || 20),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('verify'),
    handler: json429('Too many verification attempts. Try again later.'),
});

// Admin API limiter — tighter cap for staff dashboard mutations.
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_ADMIN || 80),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('admin'),
    handler: json429('Too many admin requests. Try again later.'),
});

// Upload limiter — caps Cloudinary image uploads per IP per hour.
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_UPLOAD || 40),
    standardHeaders: true,
    legacyHeaders: false,
    store: store('upload'),
    handler: json429('Too many uploads. Try again later.'),
});
