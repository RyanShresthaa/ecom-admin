/**
 * Coupon validate + admin CRUD; writes call `logAudit`.
 */
import { createCoupon, findAllCoupons, findCouponByCode, deleteCoupon } from '../../shared/models/coupon.model.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';

export async function validateCouponController(req, res) {
    try {
        const code = req.body.code || req.query.code;
        const coupon = await findCouponByCode(code);
        if (!coupon) {
            return res.status(404).json({ message: 'Invalid or expired coupon', error: true, success: false });
        }
        return res.json({ data: coupon, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function listCouponsController(req, res) {
    try {
        const data = await findAllCoupons();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function createCouponController(req, res) {
    try {
        const { code, discount_type, discount_value, min_order_amt, max_uses, expires_at, active } = req.body;
        if (!code || !discount_type || discount_value == null) {
            return res.status(400).json({ message: 'code, discount_type, discount_value required', error: true, success: false });
        }
        const data = await createCoupon({ code, discount_type, discount_value, min_order_amt, max_uses, expires_at, active });
        await logAudit({
            adminId: req.userId,
            action: 'coupon.create',
            entityType: 'coupon',
            entityId: data.id,
            details: { code },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Coupon created', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function deleteCouponController(req, res) {
    try {
        await deleteCoupon(pickId(req.params.id));
        await logAudit({
            adminId: req.userId,
            action: 'coupon.delete',
            entityType: 'coupon',
            entityId: pickId(req.params.id),
            details: {},
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Deleted', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
