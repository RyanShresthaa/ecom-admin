/**
 * Return requests + admin status; approved returns may restore stock via `orderStock.js`.
 */
import { createReturnRequest, findReturnsByUser, findAllReturns, updateReturnStatus } from '../../shared/models/return.model.js';
import { findOrderById, updateOrder } from '../../shared/models/order.model.js';
import { restoreStock } from '../../shared/utils/orderStock.js';
import { ensureCreditNoteForApprovedReturn } from '../../shared/utils/salesCreditFromReturn.js';
import pool from '../../shared/config/connectDB.js';
import { pickId } from '../../shared/utils/sql.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { logger } from '../../shared/utils/logger.js';
import { bustCache } from '../../shared/utils/responseCache.js';

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
        const id = pickId(req.body._id);
        const { status, admin_note } = req.body;
        const updated = await updateReturnStatus(id, status, admin_note);
        if (status === 'approved' && updated) {
            if (updated.order_row_id) {
                const order = await findOrderById(updated.order_row_id);
                if (order) {
                    if (!order.stockRestored) {
                        const qty = Math.max(1, Number(order.quantity || order.product_details?.quantity || 1));
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
                    }
                    await updateOrder(pickId(order.id), {
                        delivery_status: 'Returned',
                        payment_status: 'Refunded',
                        stock_restored: true,
                    });
                    bustCache('admin:stats');
                    bustCache('products:');
                }
            }
            ensureCreditNoteForApprovedReturn(pickId(updated.id), req.userId).catch((err) =>
                logger.warn('Credit note generation failed', { message: err.message, returnId: updated.id }),
            );
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
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
