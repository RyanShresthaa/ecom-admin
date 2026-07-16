/**
 * `requireRole('Admin')` / `requireRole('Admin','Seller')` after `auth`.
 */
/** Role gates: admin (Admin only), staff (Admin + Seller) */
import { findUserById } from '../models/user.model.js';

export const requireRole = (...roles) => async (req, res, next) => {
    try {
        // Reload current user role and enforce allowed role list for route.
        const user = await findUserById(req.userId);
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
