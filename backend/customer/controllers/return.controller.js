/**
 * Return requests + admin status.
 * Approved returns delegate stock + payment_status + credit note to payments/refundService.
 */
import {
    createReturnRequest,
    findReturnsByUser,
    findAllReturns,
    updateReturnStatus,
} from '../../shared/models/return.model.js';
import { findOrderById } from '../../shared/models/order.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { logger } from '../../shared/utils/logger.js';
import {
    refundApprovedReturn,
    ensureCreditNoteForApprovedReturn,
    isRefundedStatus,
} from '../../shared/services/payments/index.js';

// POST /api/return/request — submits a return request for delivered items.
export async function requestReturnController(req, res) {
    try {
        const orderRowId = pickId(req.body.orderRowId || req.body._id);
        const reason = req.body.reason || '';
        const order = await findOrderById(orderRowId);
        if (!order || order.userId !== req.userId) {
            return res.status(404).json({ message: 'Order not found', error: true, success: false });
        }
        const data = await createReturnRequest({ orderRowId, userId: req.userId, reason });
        return res.json({ message: 'Return requested', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/return/mine — lists return requests created by current user.
export async function myReturnsController(req, res) {
    try {
        const data = await findReturnsByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/return/all — lists all return requests for staff/admin.
export async function allReturnsController(req, res) {
    try {
        const data = await findAllReturns();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/return/update — updates return request status and resolution.
export async function updateReturnController(req, res) {
    try {
        const id = pickId(req.body._id);
        const { status, admin_note } = req.body;
        const updated = await updateReturnStatus(id, status, admin_note);

        if (status === 'approved' && updated?.order_row_id) {
            const order = await findOrderById(updated.order_row_id);
            if (order) {
                try {
                    if (!isRefundedStatus(order.payment_status || order.paymentStatus)) {
                        // Full offline refund: stock + payment_status Refunded + credit note
                        await refundApprovedReturn({
                            orderRowId: updated.order_row_id,
                            returnId: pickId(updated.id),
                            createdByUserId: req.userId,
                            reason: updated.reason || admin_note || 'Return approved',
                        });
                    } else {
                        // Already refunded — still ensure credit note exists for the return
                        await ensureCreditNoteForApprovedReturn(pickId(updated.id), req.userId);
                    }
                } catch (err) {
                    logger.warn('Return approval refund failed', {
                        message: err.message,
                        returnId: updated.id,
                    });
                    throw err;
                }
            }
        }

        await logAudit({
            adminId: req.userId,
            action: 'return.update',
            entityType: 'return',
            entityId: id,
            details: { status },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Updated', data: updated, error: false, success: true });
    } catch (e) {
        const status = e.status || 500;
        return res.status(status).json({ message: e.message, error: true, success: false });
    }
}

