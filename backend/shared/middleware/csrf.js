/**
 * Double-submit CSRF: `csrfToken` cookie must match `X-CSRF-Token` on mutating requests when session cookies exist.
 * Skipped for GET/HEAD/OPTIONS, EXEMPT_PATHS (login/register/refresh/…), and anonymous requests (no session cookies).
 * @see docs/README.md — troubleshooting 403 CSRF
 */
import crypto from 'crypto';
import { getAccessCookieOptions } from '../config/security.js';
import { logSecurityEvent } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must work without an existing CSRF cookie */
const EXEMPT_PATHS = new Set([
    '/api/user/register',
    '/api/user/login',
    '/api/user/google',
    '/api/user/verify-email',
    '/api/user/forgot-password',
    '/api/user/verify-forgot-password-otp',
    '/api/user/reset-password',
    '/api/user/login-pin',
    '/api/user/forgot-pin',
    '/api/user/verify-forgot-pin-otp',
    '/api/user/reset-pin',
    '/api/user/refresh-token',
    '/api/health',
    '/api/feedback/submit',
]);

function hasSessionCookies(req) {
    return Boolean(req.cookies?.accessToken || req.cookies?.token || req.cookies?.refreshToken);
}

export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res, token) {
    const base = getAccessCookieOptions();
    res.cookie('csrfToken', token, {
        httpOnly: false,
        secure: base.secure,
        sameSite: base.sameSite,
        path: '/',
        maxAge: base.maxAge,
    });
}

export function csrfProtection(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const path = req.originalUrl?.split('?')[0] || req.path;
    if (EXEMPT_PATHS.has(path)) return next();

    // Anonymous POST (catalog search, coupon validate) — no session cookies to protect
    if (!hasSessionCookies(req)) return next();

    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        logSecurityEvent({
            userId: req.userId,
            action: 'csrf.blocked',
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
            success: false,
            details: { path, method: req.method },
        }).catch(() => {});
        return res.status(403).json({
            message: 'Invalid or missing CSRF token',
            error: true,
            success: false,
        });
    }
    next();
}
