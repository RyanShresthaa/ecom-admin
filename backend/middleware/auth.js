/**
 * JWT auth — reads `accessToken` cookie or `Authorization: Bearer <jwt>`.
 * Sets `req.userId` and `req.user` (Active users only). Rejects legacy `token` cookie
 * and malformed Authorization headers. Troubleshooting: docs/README.md
 */
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/user.model.js';
import { getAccessSecret, JWT_VERIFY_OPTIONS } from '../config/security.js';
import { logSecurityEvent } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { extractAccessToken } from '../utils/extractAuthToken.js';

const auth = async (req, res, next) => {
    try {
        const extracted = extractAccessToken(req);

        if (extracted.error === 'malformed_authorization') {
            await logSecurityEvent({
                action: 'auth.malformed_authorization',
                ip: getClientIp(req),
                userAgent: getUserAgent(req),
                success: false,
                details: { path: req.originalUrl },
            }).catch(() => {});
            return res.status(401).json({ message: 'Not authorized', error: true, success: false });
        }

        const token = extracted.token;
        if (!token) {
            await logSecurityEvent({
                action: 'auth.missing_token',
                ip: getClientIp(req),
                userAgent: getUserAgent(req),
                success: false,
                details: { path: req.originalUrl },
            }).catch(() => {});
            return res.status(401).json({ message: 'Not authorized', error: true, success: false });
        }

        const decoded = jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        const userId = decoded.id ?? decoded._id;
        const user = await findUserById(userId);

        if (!user) {
            return res.status(401).json({ message: 'Not authorized', error: true, success: false });
        }
        if (user.status !== 'Active') {
            return res.status(401).json({ message: 'Account not active', error: true, success: false });
        }

        req.userId = user.id;
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: 'Not authorized', error: true, success: false });
    }
};

/** Attach user when access JWT is valid; otherwise continue without 401 (for session probes). */
export const optionalAuth = async (req, _res, next) => {
    try {
        const extracted = extractAccessToken(req);
        if (extracted.error === 'malformed_authorization' || !extracted.token) {
            return next();
        }
        const decoded = jwt.verify(extracted.token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        const userId = decoded.id ?? decoded._id;
        const user = await findUserById(userId);
        if (user && user.status === 'Active') {
            req.userId = user.id;
            req.user = user;
        }
    } catch {
        /* expired / invalid access — caller may refresh */
    }
    next();
};

export default auth;
export const protect = auth;
