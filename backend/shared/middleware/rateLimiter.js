/**
 * express-rate-limit + slow-down presets (API, auth, admin, upload, password, verify-email).
 */
/**
 * Rate limits per route group. Env: RATE_LIMIT_API, RATE_LIMIT_AUTH, etc.
 * Troubleshooting 429: docs/README.md
 */
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

const json429 = (message) => (_req, res) => {
    res.status(429).json({ message, error: true, success: false });
};

/** Progressive delay after many requests (abuse) */
export const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: Number(process.env.SLOW_DOWN_AFTER || 80),
    delayMs: (hits) => Math.min(hits * 50, 3000),
    validate: { delayMs: false },
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_API || 300),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many requests. Try again later.'),
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_AUTH || 30),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many attempts. Try again later.'),
});

export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PASSWORD || 5),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many reset attempts. Try again later.'),
});

/** Email verification token attempts */
export const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_VERIFY_EMAIL || 20),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many verification attempts. Try again later.'),
});

export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_ADMIN || 80),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many admin requests. Try again later.'),
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_UPLOAD || 40),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Too many uploads. Try again later.'),
});
