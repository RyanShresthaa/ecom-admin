/**
 * JWT auth — reads `accessToken` cookie or `Authorization` Bearer.
 * Sets `req.userId` and `req.user` (Active users only). Troubleshooting: docs/README.md
 */
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/user.model.js';
import { getAccessSecret, JWT_VERIFY_OPTIONS } from '../config/security.js';
import { logSecurityEvent } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';

const auth = async (req, res, next) => {
    try {
        // Accept access token from cookie-first auth flow or Bearer fallback.
        const token =
            req.cookies.accessToken ||
            req.cookies.token ||
            req.headers.authorization?.split(' ')[1];

        if (!token) {
            // Reject protected route calls with no session token.
            await logSecurityEvent({
                action: 'auth.missing_token',
                ip: getClientIp(req),
                userAgent: getUserAgent(req),
                success: false,
                details: { path: req.originalUrl },
            }).catch(() => {});
            return res.status(401).json({ message: 'Not authorized', error: true, success: false });
        }

        // Verify JWT signature/expiry before loading active user profile.
        const decoded = jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        const userId = decoded.id ?? decoded._id;
        const user = await findUserById(userId);

        if (!user) {
            return res.status(401).json({ message: 'Not authorized', error: true, success: false });
        }
        // Deny disabled users from all auth-protected APIs.
        if (user.status !== 'Active') {
            return res.status(401).json({ message: 'Account not active', error: true, success: false });
        }

        // Attach authenticated identity for downstream role and ownership checks.
        req.userId = user.id;
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: 'Not authorized', error: true, success: false });
    }
};

export default auth;
export const protect = auth;
