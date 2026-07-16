/**
 * If a valid access token is present, sets req.userId / req.user (Active only). Otherwise continues anonymously.
 */
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/user.model.js';
import { getAccessSecret, JWT_VERIFY_OPTIONS } from '../config/security.js';

export default async function optionalAuth(req, _res, next) {
    try {
        // Attempt to hydrate req.user on routes that allow guest access.
        const token =
            req.cookies?.accessToken ||
            req.cookies?.token ||
            req.headers.authorization?.split(' ')[1];
        // Skip identity attachment when token is absent.
        if (!token) return next();
        const decoded = jwt.verify(token, getAccessSecret(), JWT_VERIFY_OPTIONS);
        const userId = decoded.id ?? decoded._id;
        const user = await findUserById(userId);
        // Only attach active users so suspended accounts stay unauthenticated.
        if (user?.status === 'Active') {
            req.userId = user.id;
            req.user = user;
        }
    } catch {
        /* anonymous */
    }
    next();
}
