/**
 * Core refund orchestration (Phase 1 — offline / manual).
 *
 * Flow:
 *   1. Load order line + compute remaining refundable amount
 *   2. Call provider (manual now; Stripe stub later)
 *   3. Insert payment_refunds ledger row
 *   4. Update orders.payment_status (Partially Refunded | Refunded)
 *   5. Optionally restore stock + pair delivery_status → Returned
 *   6. Optionally create a sales credit note
 *
 * Controllers should call these functions — keep HTTP thin.
 */
import pool from '../../config/connectDB.js';
import { pickId } from '../../utils/sql.js';
import { findOrderById, updateOrder } from '../../models/order.model.js';
import {
    insertRefund,
    sumCompletedRefundsForOrderRow,
    attachCreditNoteToRefund,
    findRefundsByOrderRowId,
} from '../../models/refund.model.js';
import { restoreStock } from '../../utils/orderStock.js';
import { getShopSettingsMap } from '../../models/settings.model.js';
import { bustCache } from '../../utils/responseCache.js';
import { getRefundProvider } from './providers/index.js';
import { createCreditNoteForOrderLine, ensureCreditNoteForApprovedReturn } from './creditNote.js';
import {
    PAYMENT_STATUS,
    DELIVERY_STATUS,
    REFUND_PROVIDER,
} from './constants.js';
import { isRefundedStatus } from './statusPairing.js';
import { incrementVariantStock } from '../../models/variant.model.js';
import { syncProductStockFromVariants } from '../catalog/index.js';

// Compute refundable amount from line total with order total fallback.
function lineRefundableAmount(order) {
    const line = Number(order.lineTotal || 0);
    if (line > 0) return line;
    return Number(order.totalAmt || 0);
}

// Normalize currency arithmetic to two-decimal precision.
function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

/**
 * Restore product stock for one order line (once).
 * Variant lines restore variant.stock + re-sync parent aggregate.
 */
async function restoreLineStock(order) {
    // Restore stock in the correct inventory model for variant/non-variant products.
    const productId = pickId(order.productId);
    const variantId = pickId(order.variantId || order.variant_id || order.product_details?.variantId);
    const qty = Math.max(1, Number(order.quantity || order.product_details?.quantity || 1));
    if (!productId || !qty) return false;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (variantId) {
            await incrementVariantStock(client, new Map([[variantId, qty]]));
            await syncProductStockFromVariants(productId, client);
        } else {
            await restoreStock(client, new Map([[productId, qty]]));
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Refund a single order line (full or partial).
 *
 * @param {object} opts
 * @param {number|string} opts.orderRowId - orders.id
 * @param {number} [opts.amount] - omit for full remaining balance
 * @param {string} [opts.reason]
 * @param {'manual'|'stripe'} [opts.provider='manual']
 * @param {boolean} [opts.restoreStock] - default true only when refund covers remaining balance
 * @param {boolean} [opts.createCreditNote=true]
 * @param {number} [opts.createdByUserId]
 * @param {number} [opts.orderReturnId] - link when coming from return approval
 */
export async function refundOrderLine(opts) {
    // Validate target order row and current refundability status.
    const orderRowId = pickId(opts.orderRowId);
    const order = await findOrderById(orderRowId);
    if (!order) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }

    if (isRefundedStatus(order.payment_status || order.paymentStatus)) {
        const err = new Error('Order line is already fully refunded');
        err.status = 400;
        throw err;
    }

    // Enforce remaining-balance guardrails for full and partial refunds.
    const refundableTotal = roundMoney(lineRefundableAmount(order));
    if (refundableTotal <= 0) {
        const err = new Error('Order line has no refundable amount');
        err.status = 400;
        throw err;
    }

    const alreadyRefunded = roundMoney(await sumCompletedRefundsForOrderRow(orderRowId));
    const remaining = roundMoney(refundableTotal - alreadyRefunded);
    if (remaining <= 0) {
        const err = new Error('Nothing left to refund on this order line');
        err.status = 400;
        throw err;
    }

    const requested =
        opts.amount == null || opts.amount === ''
            ? remaining
            : roundMoney(opts.amount);

    if (!(requested > 0)) {
        const err = new Error('Refund amount must be greater than zero');
        err.status = 400;
        throw err;
    }
    if (requested > remaining + 0.001) {
        const err = new Error(`Refund amount exceeds remaining balance (${remaining})`);
        err.status = 400;
        throw err;
    }

    const isFull = requested >= remaining - 0.001;
    // Full refunds restore stock by default; partial money-only refunds do not.
    const shouldRestoreStock =
        opts.restoreStock != null ? Boolean(opts.restoreStock) : isFull;
    const shouldCreditNote = opts.createCreditNote !== false;

    const settings = await getShopSettingsMap();
    const currency = settings.currency || 'NPR';

    // Execute provider refund operation and capture gateway metadata.
    const providerName = String(opts.provider || REFUND_PROVIDER.MANUAL).toLowerCase();
    const provider = getRefundProvider(providerName);
    const gateway = await provider.createRefund({
        amount: requested,
        currency,
        reason: opts.reason || '',
        paymentId: order.paymentId || order.payment_id || '',
    });

    let stockRestoredNow = false;
    if (shouldRestoreStock && !order.stockRestored) {
        stockRestoredNow = await restoreLineStock(order);
    }

    // Persist refund ledger row and update paired order payment/delivery states.
    const refundRow = await insertRefund({
        orderRowId,
        orderId: order.orderId || order.order_id || '',
        userId: order.userId,
        amount: requested,
        currency,
        reason: opts.reason || '',
        provider: gateway.provider,
        providerRefundId: gateway.providerRefundId,
        status: gateway.status,
        stockRestored: stockRestoredNow || Boolean(order.stockRestored && shouldRestoreStock),
        orderReturnId: opts.orderReturnId || null,
        createdByUserId: opts.createdByUserId || null,
    });

    const newTotalRefunded = roundMoney(alreadyRefunded + requested);
    const fullyRefunded = newTotalRefunded >= refundableTotal - 0.001;

    const nextPayment = fullyRefunded
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.PARTIALLY_REFUNDED;

    const patch = {
        payment_status: nextPayment,
        stock_restored: Boolean(order.stockRestored) || stockRestoredNow,
    };
    // Pair delivery only when this refund fully closes the line and we restored (or already restored) stock.
    if (fullyRefunded && (stockRestoredNow || order.stockRestored || shouldRestoreStock)) {
        patch.delivery_status = DELIVERY_STATUS.RETURNED;
        patch.stock_restored = true;
    }

    const updatedOrder = await updateOrder(orderRowId, patch);

    // Create/attach credit note document when refund policy requires it.
    let creditNote = null;
    if (shouldCreditNote) {
        if (opts.orderReturnId) {
            creditNote = await ensureCreditNoteForApprovedReturn(
                opts.orderReturnId,
                opts.createdByUserId,
            );
        } else {
            creditNote = await createCreditNoteForOrderLine({
                order,
                amount: requested,
                reason: opts.reason || 'Refund',
                createdByUserId: opts.createdByUserId,
            });
        }
        if (creditNote?.id) {
            await attachCreditNoteToRefund(refundRow.id, creditNote.id);
            refundRow.creditNoteId = creditNote.id;
            refundRow.credit_note_id = creditNote.id;
        }
    }

    bustCache('admin:stats');
    bustCache('products:');

    return {
        refund: refundRow,
        order: updatedOrder,
        creditNote,
        meta: {
            refundableTotal,
            previouslyRefunded: alreadyRefunded,
            refundedNow: requested,
            remainingAfter: roundMoney(remaining - requested),
            fullyRefunded,
            provider: gateway.provider,
        },
    };
}

/**
 * Used by return approval: full refund of the returned line + stock + credit note.
 */
// Issue full refund path used by approved return workflow.
export async function refundApprovedReturn({ orderRowId, returnId, createdByUserId, reason }) {
    return refundOrderLine({
        orderRowId,
        amount: undefined, // full remaining
        reason: reason || 'Return approved',
        provider: REFUND_PROVIDER.MANUAL,
        restoreStock: true,
        createCreditNote: true,
        orderReturnId: returnId,
        createdByUserId,
    });
}

/** Read helpers for controllers */
// Read refund rows attached to one order line.
export async function getRefundsForOrderRow(orderRowId) {
    return findRefundsByOrderRowId(orderRowId);
}

export { sumCompletedRefundsForOrderRow };
