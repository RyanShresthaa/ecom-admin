/**
 * Admin dashboard, user list/role, seller approve/reject, audit & security event reads.
 */
import { countOrders, sumRevenue, findUserOrderStats } from '../../shared/models/order.model.js';
import { countProducts } from '../../shared/models/product.model.js';
import { findCategories } from '../../shared/models/category.model.js';
import {
    findUsers,
    findUserById,
    findUserByEmail,
    createUser,
    updateUser,
    findUserPublicById,
    countUsers,
} from '../../shared/models/user.model.js';
import { findAddressesByUser, createAddress } from '../../shared/models/address.model.js';
import { listFeedback } from '../../shared/models/feedback.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { findAuditLogs } from '../../shared/models/audit.model.js';
import { findSecurityEvents } from '../../shared/models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { validatePasswordStrength } from '../../shared/utils/password.js';
import bcrypt from 'bcrypt';
import {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    syncLowStockNotifications,
    createNotification,
} from '../../shared/models/notification.model.js';
import { withCache } from '../../shared/utils/responseCache.js';

const ALLOWED_ROLES = ['User', 'Seller', 'Admin'];

export const getDashboardStatsController = async (req, res) => {
    try {
        const data = await withCache('admin:stats', 2500, async () => {
            const [ordersCount, productsCount, categories, totalRevenue, usersCount] = await Promise.all([
                countOrders(),
                countProducts(),
                findCategories(),
                sumRevenue(),
                countUsers({ role: 'User' }),
            ]);
            return {
                ordersCount,
                productsCount,
                categoriesCount: categories.length,
                totalRevenue,
                usersCount,
            };
        });
        return res.json({
            data,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const listNotificationsController = async (_req, res) => {
    try {
        await syncLowStockNotifications();
        const data = await listNotifications({ limit: 80 });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const markNotificationReadController = async (req, res) => {
    try {
        const data = await markNotificationRead(req.params.id);
        if (!data) return res.status(404).json({ message: 'Notification not found', error: true, success: false });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const markAllNotificationsReadController = async (_req, res) => {
    try {
        await markAllNotificationsRead();
        return res.json({ success: true, error: false });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export { createNotification };

/** GET /api/admin/users — optional ?role=User&sellerRequest=true */
export const listUsersController = async (req, res) => {
    try {
        const { role, sellerRequest } = req.query;
        const [users, stats] = await Promise.all([
            findUsers({
                role: role || undefined,
                sellerRequest: sellerRequest === 'true',
            }),
            findUserOrderStats().catch(() => []),
        ]);
        const byUser = new Map(stats.map((s) => [String(s.userId), s]));
        const data = users.map((u) => {
            const id = String(u.id ?? u._id);
            const s = byUser.get(id) || {};
            return {
                ...u,
                orderCount: s.orderCount || 0,
                lifetimeValue: s.lifetimeValue || 0,
            };
        });
        return res.json({ message: 'users', data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/admin/users — create customer (User) in DB */
export const createCustomerController = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            mobile,
            addressLine,
            address_line,
            city,
            state,
            pincode,
            zip,
            country,
        } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'name, email, and password are required',
                error: true,
                success: false,
            });
        }
        const pwdErr = validatePasswordStrength(password);
        if (pwdErr) {
            return res.status(400).json({ message: pwdErr, error: true, success: false });
        }
        const existing = await findUserByEmail(String(email).trim().toLowerCase());
        if (existing) {
            return res.status(409).json({ message: 'A user with this email already exists', error: true, success: false });
        }
        const hashPassword = await bcrypt.hash(password, 10);
        const created = await createUser({
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            password: hashPassword,
        });
        const userId = pickId(created);
        const phoneVal = String(mobile || phone || '').trim();
        await updateUser(userId, {
            role: 'User',
            verify_email: true,
            status: 'Active',
            ...(phoneVal ? { mobile: phoneVal } : {}),
        });

        const line = String(addressLine || address_line || '').trim();
        const cityVal = String(city || '').trim();
        const stateVal = String(state || '').trim();
        const pinVal = String(pincode || zip || '').trim();
        const countryVal = String(country || '').trim();
        const hasAddress = Boolean(line || cityVal || stateVal || pinVal || countryVal);
        let addresses = [];
        if (hasAddress) {
            const createdAddress = await createAddress({
                userId,
                address_line: line || '—',
                city: cityVal,
                state: stateVal,
                pincode: pinVal || null,
                country: countryVal || 'Nepal',
                mobile: phoneVal || null,
            });
            addresses = [
                {
                    id: String(createdAddress.id ?? createdAddress._id ?? ''),
                    label: 'Shipping',
                    line1: createdAddress.address_line || line,
                    line2: '',
                    city: createdAddress.city || cityVal,
                    state: createdAddress.state || stateVal,
                    zip: createdAddress.pincode || pinVal,
                    country: createdAddress.country || countryVal,
                    isDefault: true,
                    phone: createdAddress.mobile || phoneVal,
                },
            ];
        }

        await logAudit({
            adminId: req.userId,
            action: 'user.create_customer',
            entityType: 'user',
            entityId: userId,
            details: { email: String(email).trim().toLowerCase(), hasAddress },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        const data = await findUserPublicById(userId);
        return res.status(201).json({
            message: 'Customer created',
            data: { ...data, orderCount: 0, lifetimeValue: 0, addresses, tags: [] },
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** GET /api/admin/users/:id — profile + addresses + order stats */
export const getUserDetailController = async (req, res) => {
    try {
        const userId = pickId(req.params.id);
        if (!userId) {
            return res.status(400).json({ message: 'user id required', error: true, success: false });
        }
        const user = await findUserPublicById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found', error: true, success: false });
        }
        const [addresses, stats] = await Promise.all([
            findAddressesByUser(userId),
            findUserOrderStats().catch(() => []),
        ]);
        const s = stats.find((row) => String(row.userId) === String(userId)) || {};
        const orderCount = s.orderCount || 0;
        const lifetimeValue = s.lifetimeValue || 0;
        return res.json({
            message: 'user',
            data: {
                ...user,
                orderCount,
                lifetimeValue,
                avgOrderValue: orderCount > 0 ? lifetimeValue / orderCount : 0,
                addresses: (addresses || []).map((a, idx) => ({
                    id: String(a.id ?? a._id ?? idx),
                    label: a.address_line ? 'Shipping' : 'Address',
                    line1: a.address_line || a.line1 || '',
                    line2: a.line2 || '',
                    city: a.city || '',
                    state: a.state || '',
                    zip: a.pincode || a.zip || '',
                    country: a.country || '',
                    isDefault: idx === 0,
                    phone: a.mobile || a.phone || '',
                })),
                tags: [],
            },
            error: false,
            success: true,
        });
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
