/**
 * If a valid access token is present, sets req.userId / req.user (Active only). Otherwise continues anonymously.
 * Does not accept legacy `token` cookie. Malformed Authorization is ignored (anonymous).
 */
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/user.model.js';
import { getAccessSecret, JWT_VERIFY_OPTIONS } from '../config/security.js';
import { extractAccessToken } from '../utils/extractAuthToken.js';

export default async function optionalAuth(req, _res, next) {
    try {
        const extracted = extractAccessToken(req);
        if (extracted.error || !extracted.token) return next();

        const decoded = jwt.verify(extracted.token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        const userId = decoded.id ?? decoded._id;
        const user = await findUserById(userId);
        if (user?.status === 'Active') {
            req.userId = user.id;
            req.user = user;
        }
    } catch {
        /* anonymous */
    }
    next();
}
