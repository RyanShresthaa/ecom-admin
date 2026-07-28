/**
 * Admin dashboard, user list/role, seller approve/reject, audit & security event reads.
 */
import { countOrders, sumRevenue } from '../models/order.model.js';
import { countProducts } from '../models/product.model.js';
import { findCategories } from '../models/category.model.js';
import { findUsers, findUserById, updateUser, findUserPublicById } from '../models/user.model.js';
import { listFeedback } from '../models/feedback.model.js';
import { pickId } from '../utils/sql.js';
import { logAudit } from '../models/audit.model.js';
import { findAuditLogs } from '../models/audit.model.js';
import { findSecurityEvents } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';

const ALLOWED_ROLES = ['User', 'Seller', 'Admin'];

export const getDashboardStatsController = async (req, res) => {
    try {
        const [ordersCount, productsCount, categories, totalRevenue] = await Promise.all([
            countOrders(),
            countProducts(),
            findCategories(),
            sumRevenue(),
        ]);
        return res.json({
            data: {
                ordersCount,
                productsCount,
                categoriesCount: categories.length,
                totalRevenue,
            },
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** GET /api/admin/users — optional ?role=User&sellerRequest=true */
export const listUsersController = async (req, res) => {
    try {
        const { role, sellerRequest } = req.query;
        const users = await findUsers({
            role: role || undefined,
            sellerRequest: sellerRequest === 'true',
        });
        return res.json({ message: 'users', data: users, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** PUT /api/admin/users/:id/role  body: { role: "Seller" | "User" | "Admin" } */
export const setUserRoleController = async (req, res) => {
    try {
        const userId = pickId(req.params.id);
        const { role } = req.body || {};
        if (!userId || !role) {
            return res.status(400).json({ message: 'user id and role are required', error: true, success: false });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                message: `role must be one of: ${ALLOWED_ROLES.join(', ')}`,
                error: true,
                success: false,
            });
        }
        const target = await findUserById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (pickId(target._id) === req.userId && role !== 'Admin') {
            return res.status(400).json({ message: 'You cannot remove your own admin access', error: true, success: false });
        }
        const fields = { role };
        if (role === 'Seller' || role === 'Admin') fields.seller_request = false;
        if (role === 'Admin') fields.verify_email = true;
        const updated = await updateUser(userId, fields);
        await logAudit({
            adminId: req.userId,
            action: 'user.role_update',
            entityType: 'user',
            entityId: userId,
            details: { role },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({
            message: role === 'Seller' ? 'Seller approved' : 'Role updated',
            data: await findUserPublicById(updated.id),
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/admin/users/:id/approve-seller — shortcut for pending requests */
export const approveSellerController = async (req, res) => {
    try {
        const userId = pickId(req.params.id);
        const target = await findUserById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found', error: true, success: false });
        }
        await updateUser(userId, { role: 'Seller', seller_request: false });
        await logAudit({
            adminId: req.userId,
            action: 'seller.approve',
            entityType: 'user',
            entityId: userId,
            details: {},
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({
            message: 'Seller approved',
            data: await findUserPublicById(userId),
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/admin/users/:id/reject-seller */
export const rejectSellerController = async (req, res) => {
    try {
        const userId = pickId(req.params.id);
        const target = await findUserById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found', error: true, success: false });
        }
        await updateUser(userId, { seller_request: false });
        return res.json({ message: 'Seller request rejected', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getAuditLogsController = async (req, res) => {
    try {
        const data = await findAuditLogs({ limit: Number(req.query.limit) || 50, skip: Number(req.query.skip) || 0 });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getSecurityEventsController = async (req, res) => {
    try {
        const data = await findSecurityEvents({
            limit: Number(req.query.limit) || 100,
            skip: Number(req.query.skip) || 0,
            userId: req.query.userId ? Number(req.query.userId) : undefined,
            action: req.query.action,
        });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** GET /api/admin/feedback — optional ?targetType=product|seller|business */
export const listFeedbackController = async (req, res) => {
    try {
        const { targetType } = req.query;
        const data = await listFeedback({
            limit: Math.min(200, Number(req.query.limit) || 50),
            skip: Number(req.query.skip) || 0,
            targetType: targetType && ['product', 'seller', 'business'].includes(String(targetType)) ? String(targetType) : undefined,
        });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** PUT /api/admin/users/:id/status — reactivate deactivated accounts or suspend */
export const setUserStatusController = async (req, res) => {
    try {
        const userId = pickId(req.params.id);
        const { status } = req.body || {};
        if (!userId || !status) {
            return res.status(400).json({ message: 'user id and status are required', error: true, success: false });
        }
        if (!['Active', 'Inactive'].includes(status)) {
            return res.status(400).json({ message: 'status must be Active or Inactive', error: true, success: false });
        }
        const target = await findUserById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found', error: true, success: false });
        }
        await updateUser(userId, { status });
        await logAudit({
            adminId: req.userId,
            action: 'user.status_update',
            entityType: 'user',
            entityId: userId,
            details: { status },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({
            message: 'User status updated',
            data: await findUserPublicById(userId),
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
