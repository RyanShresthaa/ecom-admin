/**
 * Staff refund HTTP handlers — full / partial offline refunds (Phase 1).
 * Stripe provider returns 501 until configured later.
 */
import { pickId } from '../../shared/utils/sql.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { findRefundById, listRefunds } from '../../shared/models/refund.model.js';
import {
    refundOrderLine,
    getRefundsForOrderRow,
    REFUND_PROVIDER,
} from '../../shared/services/payments/index.js';

function refundErrorStatus(error) {
    if (error.status) return error.status;
    return 500;
}

/**
 * POST /api/payment/refund
 * Body: { orderRowId, amount?, reason?, provider?, restoreStock?, createCreditNote? }
 */
// POST /api/payment/refund — creates a refund request for order rows.
export async function createRefundController(req, res) {
    try {
        const orderRowId = pickId(req.body.orderRowId || req.body._id || req.body.orderId);
        if (!orderRowId) {
            return res.status(400).json({
                message: 'orderRowId is required (orders.id of the line to refund)',
                error: true,
                success: false,
            });
        }

        const provider = String(req.body.provider || REFUND_PROVIDER.MANUAL).toLowerCase();
        const result = await refundOrderLine({
            orderRowId,
            amount: req.body.amount,
            reason: req.body.reason || '',
            provider,
            restoreStock: req.body.restoreStock,
            createCreditNote: req.body.createCreditNote,
            createdByUserId: req.userId,
        });

        await logAudit({
            adminId: req.userId,
            action: 'payment.refund',
            entityType: 'order',
            entityId: orderRowId,
            details: {
                refundId: result.refund?.id,
                amount: result.meta?.refundedNow,
                provider: result.meta?.provider,
                fullyRefunded: result.meta?.fullyRefunded,
            },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });

        return res.json({
            message: result.meta.fullyRefunded ? 'Refund completed (full)' : 'Refund completed (partial)',
            data: result,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(refundErrorStatus(error)).json({
            message: error.message || error,
            error: true,
            success: false,
            code: error.code,
        });
    }
}

/** GET /api/payment/refunds?orderRowId=&orderId= */
// GET /api/payment/refunds — lists refunds with admin filters.
export async function listRefundsController(req, res) {
    try {
        const orderRowId = req.query.orderRowId || req.query.order_row_id;
        const orderId = req.query.orderId || req.query.order_id;
        const data = await listRefunds({
            orderRowId: orderRowId || undefined,
            orderId: orderId || undefined,
            limit: Number(req.query.limit) || 50,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
}

/** GET /api/payment/refunds/:id */
// GET /api/payment/refunds/:id — fetches one refund by id.
export async function getRefundController(req, res) {
    try {
        const data = await findRefundById(req.params.id);
        if (!data) {
            return res.status(404).json({ message: 'Refund not found', error: true, success: false });
        }
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
}

/** GET /api/payment/refunds/by-order-row/:orderRowId */
// GET /api/payment/refunds/by-order-row/:orderRowId — lists refunds attached to an order row.
export async function getRefundsByOrderRowController(req, res) {
    try {
        const data = await getRefundsForOrderRow(req.params.orderRowId);
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
}

