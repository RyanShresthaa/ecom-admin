/**
 * Return requests + admin status; approved returns may restore stock via `orderStock.js`.
 * Customers pick a resolution (refund | exchange | damaged); refunds require admin approval.
 */
import {
    createReturnRequest,
    findReturnsByUser,
    findAllReturns,
    findOpenReturnForOrderRow,
    updateReturnStatus,
} from '../models/return.model.js';
import { findOrderById, updateOrder } from '../models/order.model.js';
import { findUserById } from '../models/user.model.js';
import { restoreStock } from '../utils/orderStock.js';
import { ensureCreditNoteForApprovedReturn } from '../utils/salesCreditFromReturn.js';
import { sendReturnDecisionNotification } from '../utils/orderEmails.js';
import pool from '../config/connectDB.js';
import { pickId } from '../utils/sql.js';
import { logAudit } from '../models/audit.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { logger } from '../utils/logger.js';

const ALLOWED_RESOLUTIONS = new Set(['refund', 'exchange', 'damaged']);
const ALLOWED_STATUSES = new Set(['approved', 'rejected']);

function normalizeResolution(raw) {
    const v = String(raw || 'refund').trim().toLowerCase();
    return ALLOWED_RESOLUTIONS.has(v) ? v : null;
}

function isDelivered(deliveryStatus) {
    return /\bdelivered\b/i.test(String(deliveryStatus || ''));
}

function isCancelledOrReturned(deliveryStatus) {
    return /\b(cancel|returned)\b/i.test(String(deliveryStatus || ''));
}

export async function requestReturnController(req, res) {
    try {
        const orderRowId = pickId(req.body.orderRowId || req.body._id);
        const reason = String(req.body.reason || '').trim().slice(0, 2000);
        const resolution = normalizeResolution(req.body.resolution || req.body.type);
        if (!orderRowId) {
            return res.status(400).json({ message: 'orderRowId is required', error: true, success: false });
        }
        if (!resolution) {
            return res.status(400).json({
                message: 'resolution must be refund, exchange, or damaged',
                error: true,
                success: false,
            });
        }
        if (!reason) {
            return res.status(400).json({ message: 'Please describe why you are returning this item', error: true, success: false });
        }

        const order = await findOrderById(orderRowId);
        if (!order || Number(order.userId) !== Number(req.userId)) {
            return res.status(404).json({ message: 'Order not found', error: true, success: false });
        }
        if (isCancelledOrReturned(order.delivery_status)) {
            return res.status(400).json({
                message: 'This order line cannot be returned',
                error: true,
                success: false,
            });
        }
        if (!isDelivered(order.delivery_status)) {
            return res.status(400).json({
                message: 'Returns are only available after the item is delivered',
                error: true,
                success: false,
            });
        }

        const open = await findOpenReturnForOrderRow(orderRowId);
        if (open) {
            return res.status(409).json({
                message: 'A return request is already pending for this item',
                data: open,
                error: true,
                success: false,
            });
        }

        const data = await createReturnRequest({
            orderRowId,
            userId: req.userId,
            reason,
            resolution,
        });
        return res.json({
            message: 'Return requested — awaiting admin approval',
            data,
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function myReturnsController(req, res) {
    try {
        const data = await findReturnsByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function allReturnsController(req, res) {
    try {
        const data = await findAllReturns();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateReturnController(req, res) {
    try {
        const id = pickId(req.body._id || req.body.id);
        const status = String(req.body.status || '').trim().toLowerCase();
        const admin_note = String(req.body.admin_note ?? req.body.adminNote ?? '').trim().slice(0, 2000);

        if (!id || !ALLOWED_STATUSES.has(status)) {
            return res.status(400).json({
                message: 'status must be approved or rejected',
                error: true,
                success: false,
            });
        }
        if (status === 'rejected' && !admin_note) {
            return res.status(400).json({
                message: 'Please include a message explaining the decline',
                error: true,
                success: false,
            });
        }

        const updated = await updateReturnStatus(id, status, admin_note || null);
        if (!updated) {
            return res.status(404).json({ message: 'Return not found', error: true, success: false });
        }

        const resolution = String(updated.resolution || 'refund').toLowerCase();
        let order = null;
        if (updated.order_row_id) {
            order = await findOrderById(updated.order_row_id);
        }

        if (status === 'approved' && order) {
            const qty = Math.max(1, Number(order.quantity || 1));
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await restoreStock(client, new Map([[pickId(order.productId), qty]]));
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }

            const paymentPatch =
                resolution === 'refund' &&
                /^(paid|card|stripe|online)/i.test(String(order.payment_status || '').trim())
                    ? 'REFUNDED'
                    : undefined;
            await updateOrder(order.id, {
                delivery_status: 'returned',
                ...(paymentPatch ? { payment_status: paymentPatch } : {}),
            });

            if (resolution === 'refund') {
                ensureCreditNoteForApprovedReturn(pickId(updated.id), req.userId).catch((err) =>
                    logger.warn('Credit note generation failed', {
                        message: err.message,
                        returnId: updated.id,
                    }),
                );
            }
        }

        const user = updated.userId || updated.user_id
            ? await findUserById(updated.userId || updated.user_id)
            : order
              ? await findUserById(order.userId)
              : null;

        if (user) {
            sendReturnDecisionNotification({
                user,
                orderId: order?.orderId || order?.order_id || String(updated.order_row_id || ''),
                status,
                resolution,
                adminNote: admin_note || updated.admin_note || updated.adminNote || '',
            }).catch((err) =>
                logger.warn('Return decision notify failed', { message: err.message, returnId: id }),
            );
        }

        await logAudit({
            adminId: req.userId,
            action: 'return.update',
            entityType: 'return',
            entityId: id,
            details: { status, resolution, admin_note: admin_note || undefined },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });

        return res.json({
            message: status === 'approved' ? 'Return approved — customer notified' : 'Return declined — customer notified',
            data: updated,
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
