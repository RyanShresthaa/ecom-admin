/**

 * Double-submit CSRF: `csrfToken` cookie must match `X-CSRF-Token` on mutating requests when session cookies exist.

 * Comparison uses crypto.timingSafeEqual.

 *

 * Always skipped: safe methods, auth bootstrap / webhook paths (AUTH_BOOTSTRAP_PATHS).

 * Anonymous mutating requests (no access/refresh cookies) are skipped so public feedback/coupon/newsletter work.

 * If session cookies are present, CSRF is required — including formerly "public" routes.

 *

 * @see docs/README.md — troubleshooting 403 CSRF

 */

import crypto from 'crypto';

import { getCsrfCookieOptions } from '../config/security.js';

import { logSecurityEvent } from '../models/securityEvent.model.js';

import { getClientIp, getUserAgent } from '../utils/requestMeta.js';



const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);



/**

 * Must work without a CSRF cookie even when some session cookies exist

 * (e.g. refresh with refreshToken only; login while a stale cookie remains).

 */

const AUTH_BOOTSTRAP_PATHS = new Set([

    '/api/user/register',

    '/api/user/login',

    '/api/user/google',
    '/api/user/2fa/verify-login',
    '/api/user/2fa/email-otp',

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

    '/api/health/live',

    '/api/health/ready',

    '/metrics',

    '/api/payment/webhook',

]);



function hasSessionCookies(req) {

    return Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);

}



/** Constant-time string compare; length mismatch returns false without throwing. */

export function timingSafeEqualStr(a, b) {

    if (typeof a !== 'string' || typeof b !== 'string') return false;

    const bufA = Buffer.from(a, 'utf8');

    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {

        if (bufA.length > 0) {

            crypto.timingSafeEqual(bufA, bufA);

        }

        return false;

    }

    if (bufA.length === 0) return false;

    return crypto.timingSafeEqual(bufA, bufB);

}



export function generateCsrfToken() {

    return crypto.randomBytes(32).toString('hex');

}



export function setCsrfCookie(res, token) {

    res.cookie('csrfToken', token, getCsrfCookieOptions());

}



export function csrfProtection(req, res, next) {

    if (SAFE_METHODS.has(req.method)) return next();



    const path = req.originalUrl?.split('?')[0] || req.path;

    if (AUTH_BOOTSTRAP_PATHS.has(path)) return next();



    // Anonymous POST (feedback, coupon, newsletter, catalog search) — no session to protect

    if (!hasSessionCookies(req)) return next();



    const cookieToken = req.cookies?.csrfToken;

    const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];



    if (!cookieToken || !headerToken || !timingSafeEqualStr(String(cookieToken), String(headerToken))) {

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



/** @deprecated Use AUTH_BOOTSTRAP_PATHS naming; kept for any external imports */

export const EXEMPT_PATHS = AUTH_BOOTSTRAP_PATHS;


