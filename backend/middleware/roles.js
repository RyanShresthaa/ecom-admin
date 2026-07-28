/**
 * `requireRole('Admin')` / `requireRole('Admin','Seller')` after `auth`.
 * Reuses `req.user` from auth middleware when already loaded for the same userId.
 */
import { findUserById } from '../models/user.model.js';

export const requireRole = (...roles) => async (req, res, next) => {
    try {
        let user = req.user;
        if (!user || String(user.id) !== String(req.userId)) {
            user = await findUserById(req.userId);
        }
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({
                message: 'Permission denied',
                error: true,
                success: false,
            });
        }
        req.user = user;
        next();
    } catch {
        return res.status(500).json({
            message: 'Permission denied',
            error: true,
            success: false,
        });
    }
};

/** Admin only — dashboard, all orders, order status */
export const admin = requireRole('Admin');

/** Admin or Seller — products, categories, uploads */
export const staff = requireRole('Admin', 'Seller');
