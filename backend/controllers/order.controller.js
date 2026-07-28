/**
 * Order & checkout HTTP handlers for `/api/order`. Totals from `resolveCheckoutLines` / `pricing.js`;
 * persistence + stock in `placeOrder.js`. Never trust client `totalAmt`.
 */
import Stripe from '../config/stripe.js';
import { clearCart } from '../models/cartproduct.model.js';
import { mapOrder, findOrdersByUser, findAllOrders, updateOrder, findOrderById, findOrdersByOrderGroupId } from '../models/order.model.js';
import { restoreStock } from '../utils/orderStock.js';
import pool from '../config/connectDB.js';
import { findUserById } from '../models/user.model.js';
import { findAddressByIdAndUser, findAddressById } from '../models/address.model.js';
import { pickId } from '../utils/sql.js';
import { resolveCheckoutLines } from '../utils/checkout.js';
import { buildOrderRowsFromSummary, insertOrdersWithStock, finalizeOrder } from '../utils/placeOrder.js';
import { unitPriceAfterDiscount } from '../utils/pricing.js';
import { sendOrderStatusEmail } from '../utils/orderEmails.js';
import { logAudit } from '../models/audit.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { isMockPaymentAllowed, MOCK_PAYMENT_DISABLED_MSG } from '../config/payments.js';
import { withCheckoutIdempotency } from '../utils/checkoutIdempotency.js';
import { biz } from '../config/businessMetrics.js';
import { logger } from '../utils/logger.js';
import {
    createPendingCheckout,
    setPendingStripeSession,
    findPendingById,
    findPendingBySessionId,
    markPendingCompleted,
    claimPendingForFinalize,
    releasePendingClaim,
} from '../models/pendingCheckout.model.js';
import { validateShippingAddress, firstAddressError } from '../utils/addressValidation.js';
import { getCachedRegionMode } from '../utils/regionModeCache.js';
import { normalizeRegionMode } from '../utils/regionPresets.js';

export const pricewithDiscount = (price, dis = 1) => unitPriceAfterDiscount(price, dis);

/** Shared COD / online paid order creation. */
export async function finalizePaidCheckout({
    userId,
    addressId,
    list_items,
    couponCode,
    useCart = false,
    paymentId,
    payment_status,
}) {
    if (!addressId) {
        const err = new Error('addressId is required');
        err.status = 400;
        throw err;
    }
    const address =
        (await findAddressByIdAndUser(pickId(addressId), userId)) ||
        (await findAddressById(pickId(addressId)));
    const ownerId = address?.userId ?? address?.user_id;
    if (!address || (ownerId != null && Number(ownerId) !== Number(userId))) {
        const err = new Error('Invalid delivery address');
        err.status = 400;
        throw err;
    }

    const addressCheck = validateShippingAddress(
        {
            address_line: address.address_line ?? address.addressLine,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
            mobile: address.mobile,
        },
        getCachedRegionMode(),
    );
    if (!addressCheck.ok) {
        const mode = normalizeRegionMode(getCachedRegionMode());
        const hint =
            mode === 'nepal'
                ? 'Update your shipping address with a valid Nepal address and mobile.'
                : 'Update your shipping address with a valid US address and phone.';
        const err = new Error(`${firstAddressError(addressCheck)} ${hint}`);
        err.status = 400;
        throw err;
    }

    const { summary, coupon, settings } = await resolveCheckoutLines({
        userId,
        list_items,
        couponCode,
        useCart: useCart === true || !list_items?.length,
    });
    summary.currency = settings.currency;

    const user = await findUserById(userId);
    const payload = buildOrderRowsFromSummary(userId, addressId, summary, paymentId, payment_status);
    const rows = await insertOrdersWithStock(payload, { couponCode: coupon?.code });
    await finalizeOrder({ user, address, summary, rows });
    await clearCart(userId);

    const generatedOrder = rows.map(mapOrder);
    return {
        message: 'Order successfully',
        error: false,
        success: true,
        data: generatedOrder,
        pricing: {
            subtotal: summary.subtotal,
            couponDiscount: summary.couponDiscount,
            taxAmt: summary.taxAmt,
            shippingAmt: summary.shippingAmt,
            totalAmt: summary.totalAmt,
            couponCode: summary.couponCode,
        },
    };
}

async function runCheckout(request, { paymentId, payment_status }) {
    return finalizePaidCheckout({
        userId: request.userId,
        addressId: request.body.addressId,
        list_items: request.body.list_items,
        couponCode: request.body.couponCode,
        useCart: request.body.useCart,
        paymentId,
        payment_status,
    });
}

function checkoutErrorStatus(error) {
    if (error.status) return error.status;
    const msg = error.message || String(error);
    return /stock|not found|not available|coupon|cart|empty|addressId|Idempotency/i.test(msg)
        ? 400
        : 500;
}

export async function CashOnDeliveryOrderController(request, response) {
    biz.checkoutStarted();
    try {
        const { status, body } = await withCheckoutIdempotency(request, () =>
            runCheckout(request, { paymentId: '', payment_status: 'CASH ON DELIVERY' }),
        );
        if (status >= 200 && status < 300 && body?.success !== false) {
            biz.orderCreated('cod');
            biz.checkoutCompleted();
            biz.paymentSucceeded('cod');
        } else {
            biz.orderFailed('cod');
            biz.checkoutAbandoned();
        }
        return response.status(status).json(body);
    } catch (error) {
        biz.orderFailed('cod');
        biz.checkoutAbandoned();
        const status = checkoutErrorStatus(error);
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

export async function paymentController(request, response) {
    biz.checkoutStarted();
    try {
        const userId = request.userId;
        const { list_items, addressId, couponCode, useCart } = request.body;
        if (!addressId) {
            biz.checkoutAbandoned();
            return response.status(400).json({ message: 'addressId is required', error: true, success: false });
        }
        const address = await findAddressByIdAndUser(pickId(addressId), userId);
        if (!address) {
            biz.checkoutAbandoned();
            return response.status(400).json({ message: 'Invalid delivery address', error: true, success: false });
        }

        const { summary, coupon, settings: shopSettings } = await resolveCheckoutLines({
            userId,
            list_items,
            couponCode,
            useCart: useCart === true || !list_items?.length,
        });

        if (!Stripe) {
            if (!isMockPaymentAllowed()) {
                biz.paymentFailed('none');
                biz.checkoutAbandoned();
                return response.status(503).json({
                    message: MOCK_PAYMENT_DISABLED_MSG,
                    error: true,
                    success: false,
                });
            }
            const { status, body } = await withCheckoutIdempotency(request, () =>
                runCheckout(request, {
                    paymentId: `MOCK-${Date.now()}`,
                    payment_status: 'PAID',
                }),
            );
            if (status >= 200 && status < 300 && body?.success !== false) {
                biz.orderCreated('mock');
                biz.checkoutCompleted();
                biz.paymentSucceeded('mock');
            } else {
                biz.orderFailed('mock');
                biz.paymentFailed('mock');
                biz.checkoutAbandoned();
            }
            return response.status(status).json(body);
        }

        const { status, body } = await withCheckoutIdempotency(request, async () => {
            const normalizedItems = (summary.lines || []).map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
            }));

            const pending = await createPendingCheckout({
                userId,
                addressId: pickId(addressId),
                couponCode: coupon?.code || null,
                listItems: normalizedItems,
            });

            const user = await findUserById(userId);
            const currency = String(
                process.env.STRIPE_CURRENCY || shopSettings?.currency || 'usd',
            ).toLowerCase();
            const line_items = summary.lines.map((item) => ({
                price_data: {
                    currency,
                    product_data: {
                        name: item.product.name,
                        images: Array.isArray(item.product.image)
                            ? item.product.image
                            : item.product.image
                              ? [item.product.image]
                              : [],
                        metadata: { productId: String(item.productId) },
                    },
                    unit_amount: Math.round(Number(item.unitPrice) * 100),
                },
                quantity: item.quantity,
            }));

            const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
            const session = await Stripe.checkout.sessions.create({
                submit_type: 'pay',
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: user.email,
                metadata: {
                    userId: String(userId),
                    addressId: String(pickId(addressId)),
                    couponCode: coupon?.code || '',
                    pendingCheckoutId: String(pending.id),
                },
                line_items,
                success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/cancel`,
            });

            await setPendingStripeSession(pending.id, session.id);
            return { ...session, pricing: summary, error: false, success: true };
        });

        return response.status(status).json(body);
    } catch (error) {
        biz.paymentFailed('stripe');
        biz.checkoutAbandoned();
        const msg = error.message || String(error);
        const status =
            error.status ||
            (/stock|not found|not available|coupon|cart|Idempotency/i.test(msg) ? 400 : 500);
        return response.status(status).json({ message: msg, error: true, success: false });
    }
}

/** Complete a Stripe session after redirect (also safe if webhook already ran). */
export async function confirmOnlineOrderController(request, response) {
    try {
        const sessionId = request.body.sessionId || request.query.session_id;
        if (!sessionId) {
            return response.status(400).json({ message: 'sessionId is required', error: true, success: false });
        }
        if (!Stripe) {
            return response.status(503).json({ message: 'Stripe is not configured', error: true, success: false });
        }

        const session = await Stripe.checkout.sessions.retrieve(String(sessionId));
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
            return response.status(400).json({
                message: 'Payment not completed',
                error: true,
                success: false,
            });
        }

        const result = await completePendingFromStripeSession(session, request.userId);
        return response.json(result);
    } catch (error) {
        const status = checkoutErrorStatus(error);
        // Do not count races / already-confirming (409) or client errors as payment failures
        if (status >= 500) {
            biz.orderFailed('stripe');
            biz.paymentFailed('stripe');
        }
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

export async function completePendingFromStripeSession(session, actingUserId = null) {
    const pendingId = pickId(session.metadata?.pendingCheckoutId);
    let pending = pendingId ? await findPendingById(pendingId) : null;
    if (!pending) {
        pending = await findPendingBySessionId(session.id);
    }
    if (!pending) {
        const err = new Error('Checkout session not found');
        err.status = 404;
        throw err;
    }

    if (actingUserId != null && Number(actingUserId) !== Number(pending.userId)) {
        const err = new Error('Permission denied');
        err.status = 403;
        throw err;
    }

    if (pending.status === 'completed' && pending.orderGroupId) {
        const existing = await findOrdersByOrderGroupId(pending.orderGroupId);
        return {
            message: 'Order already confirmed',
            error: false,
            success: true,
            data: existing,
            pricing: null,
        };
    }

    // Another worker may already be finalizing
    if (pending.status === 'processing') {
        // brief wait then re-read completed
        await new Promise((r) => setTimeout(r, 150));
        const again = await findPendingById(pending.id);
        if (again?.status === 'completed' && again.orderGroupId) {
            const existing = await findOrdersByOrderGroupId(again.orderGroupId);
            return {
                message: 'Order already confirmed',
                error: false,
                success: true,
                data: existing,
                pricing: null,
            };
        }
        const err = new Error('Checkout is still being confirmed');
        err.status = 409;
        throw err;
    }

    const claimed = await claimPendingForFinalize(pending.id);
    if (!claimed) {
        const again = await findPendingById(pending.id);
        if (again?.status === 'completed' && again.orderGroupId) {
            const existing = await findOrdersByOrderGroupId(again.orderGroupId);
            return {
                message: 'Order already confirmed',
                error: false,
                success: true,
                data: existing,
                pricing: null,
            };
        }
        const err = new Error('Checkout is still being confirmed');
        err.status = 409;
        throw err;
    }

    const paymentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || session.id;

    try {
        const body = await finalizePaidCheckout({
            userId: claimed.userId,
            addressId: claimed.addressId,
            list_items: claimed.listItems,
            couponCode: claimed.couponCode,
            useCart: false,
            paymentId,
            payment_status: 'PAID',
        });

        const orderGroupId = body.data?.[0]?.orderId || null;
        await markPendingCompleted(claimed.id, orderGroupId);
        biz.orderCreated('stripe');
        biz.checkoutCompleted();
        biz.paymentSucceeded('stripe');
        return body;
    } catch (err) {
        await releasePendingClaim(claimed.id, 'pending').catch(() => {});
        throw err;
    }
}

export async function previewCheckoutController(request, response) {
    try {
        const { summary, settings } = await resolveCheckoutLines({
            userId: request.userId,
            list_items: request.body.list_items,
            couponCode: request.body.couponCode,
            useCart: request.body.useCart === true || !request.body.list_items?.length,
        });
        biz.preview();
        return response.json({
            data: { ...summary, currency: settings.currency },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(400).json({ message: error.message, error: true, success: false });
    }
}

export async function getOrderDetailsController(request, response) {
    try {
        const orderlist = await findOrdersByUser(request.userId);
        return response.json({ message: 'order list', data: orderlist, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function getAllOrdersController(request, response) {
    try {
        const page = Math.max(1, Number(request.query.page) || 1);
        const limit = Math.min(500, Math.max(1, Number(request.query.limit) || 100));
        const skip = Math.max(0, Number(request.query.skip) || (page - 1) * limit);
        const list = await findAllOrders({ limit, skip });
        return response.json({
            message: 'all orders',
            data: list,
            page,
            limit,
            skip,
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

const isCancelledStatus = (s) => /^cancel/i.test(String(s || ''));

function isPaidStatus(s) {
    const u = String(s || '').toUpperCase().trim();
    if (!u) return false;
    if (u.includes('REFUND') || u.includes('CANCEL')) return false;
    return u === 'PAID' || u.includes('PAID');
}

function isCodStatus(s) {
    const u = String(s || '').toUpperCase();
    return u.includes('CASH') || u.includes('COD');
}

/**
 * Refund a paid checkout via Stripe when possible; mock/local payments just mark refunded.
 * Safe to call once per payment — callers should guard with sibling payment_status checks.
 */
async function refundPaidOrder(order) {
    const paymentId = String(order.paymentId || order.payment_id || '').trim();
    if (!paymentId || !Stripe) {
        return { ok: true, mode: 'mock' };
    }

    try {
        let paymentIntentId = null;
        if (paymentId.startsWith('pi_')) {
            paymentIntentId = paymentId;
        } else if (paymentId.startsWith('cs_')) {
            const session = await Stripe.checkout.sessions.retrieve(paymentId);
            paymentIntentId =
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent?.id || null;
        } else {
            // Local mock ids (PAY-…) — no Stripe charge
            return { ok: true, mode: 'mock' };
        }

        if (!paymentIntentId) {
            return { ok: true, mode: 'mock' };
        }

        await Stripe.refunds.create({ payment_intent: paymentIntentId });
        return { ok: true, mode: 'stripe' };
    } catch (err) {
        const msg = String(err.message || err);
        if (/already.?refund|charge_already_refunded/i.test(msg)) {
            return { ok: true, mode: 'already' };
        }
        throw err;
    }
}

/**
 * Cancel a whole checkout group: restore stock, refund if paid, mark COD cancelled.
 */
async function cancelOrderGroup(previous) {
    const groupId = previous.orderId || previous.order_id;
    const siblings = groupId
        ? await findOrdersByOrderGroupId(groupId)
        : [previous];

    const active = siblings.filter((s) => !isCancelledStatus(s.delivery_status));
    if (!active.length) {
        return { data: previous, payment_status: previous.payment_status, refundMode: 'noop' };
    }

    const stockMap = new Map();
    for (const s of active) {
        const pid = pickId(s.productId);
        if (!pid) continue;
        const qty = Math.max(1, Number(s.quantity || s.product_details?.quantity || 1));
        stockMap.set(pid, (stockMap.get(pid) || 0) + qty);
    }

    const representative = active[0];
    const alreadyRefunded = siblings.some((s) => /refund/i.test(String(s.payment_status || '')));
    let nextPayment = representative.payment_status || '';
    let refundMode = 'none';

    if (isPaidStatus(representative.payment_status)) {
        if (!alreadyRefunded) {
            const refund = await refundPaidOrder(representative);
            refundMode = refund.mode;
        } else {
            refundMode = 'already';
        }
        nextPayment = 'REFUNDED';
    } else if (isCodStatus(representative.payment_status) || !isPaidStatus(representative.payment_status)) {
        nextPayment = 'CANCELLED';
        refundMode = 'cod';
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock order lines so concurrent cancels cannot double-restore stock
        if (groupId) {
            await client.query(
                `SELECT id FROM orders WHERE order_id = $1 FOR UPDATE`,
                [groupId],
            );
        } else {
            await client.query(
                `SELECT id FROM orders WHERE id = $1 FOR UPDATE`,
                [pickId(previous.id || previous._id)],
            );
        }

        // Re-check cancelled inside the lock
        const locked = groupId
            ? await client.query(
                  `SELECT id, delivery_status FROM orders WHERE order_id = $1`,
                  [groupId],
              )
            : await client.query(`SELECT id, delivery_status FROM orders WHERE id = $1`, [
                  pickId(previous.id || previous._id),
              ]);
        const stillActive = locked.rows.filter((r) => !isCancelledStatus(r.delivery_status));
        if (!stillActive.length) {
            await client.query('ROLLBACK');
            return {
                data: previous,
                payment_status: previous.payment_status,
                refundMode: 'noop',
                cancelledCount: 0,
            };
        }

        if (stockMap.size) {
            await restoreStock(client, stockMap);
        }

        let updatedRows;
        if (groupId) {
            const r = await client.query(
                `UPDATE orders SET
                    delivery_status = 'cancelled',
                    payment_status = $1,
                    updated_at = NOW()
                 WHERE order_id = $2
                 RETURNING *`,
                [nextPayment, groupId],
            );
            updatedRows = r.rows.map(mapOrder);
        } else {
            const r = await client.query(
                `UPDATE orders SET
                    delivery_status = 'cancelled',
                    payment_status = $1,
                    updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [nextPayment, pickId(previous.id || previous._id)],
            );
            updatedRows = r.rows.map(mapOrder);
        }

        await client.query('COMMIT');
        return {
            data: updatedRows.find((r) => pickId(r.id) === pickId(previous.id)) || updatedRows[0],
            payment_status: nextPayment,
            refundMode,
            cancelledCount: updatedRows.length,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function updateOrderStatusController(request, response) {
    try {
        const { _id, delivery_status, payment_status } = request.body || {};
        if (!_id) {
            return response.status(400).json({ message: 'provide _id', error: true, success: false });
        }
        const orderId = pickId(_id);
        const previous = await findOrderById(orderId);
        if (!previous) {
            return response.status(404).json({ message: 'Order not found', error: true, success: false });
        }

        let updated = null;
        let cancelMeta = null;

        if (delivery_status && isCancelledStatus(delivery_status)) {
            if (isCancelledStatus(previous.delivery_status)) {
                updated = previous;
            } else {
                cancelMeta = await cancelOrderGroup(previous);
                updated = cancelMeta.data;
            }
        } else {
            updated = await updateOrder(orderId, { delivery_status, payment_status });
        }

        if (delivery_status && previous?.userId) {
            const user = await findUserById(previous.userId);
            if (user) {
                await sendOrderStatusEmail({
                    user,
                    orderId: previous.orderId,
                    status: isCancelledStatus(delivery_status) ? 'cancelled' : delivery_status,
                });
            }
        }

        await logAudit({
            adminId: request.userId,
            action: 'order.status_update',
            entityType: 'order',
            entityId: orderId,
            details: {
                delivery_status,
                payment_status: cancelMeta?.payment_status ?? payment_status,
                refundMode: cancelMeta?.refundMode,
                cancelledCount: cancelMeta?.cancelledCount,
            },
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
        });

        return response.json({
            message: cancelMeta
                ? cancelMeta.payment_status === 'REFUNDED'
                    ? 'Order cancelled and payment refunded'
                    : 'Order cancelled'
                : 'updated',
            data: updated,
            error: false,
            success: true,
        });
    } catch (error) {
        logger.warn('updateOrderStatus failed', { message: error.message });
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function getInvoiceController(request, response) {
    try {
        const order = await findOrderById(pickId(request.params.id));
        if (!order) {
            return response.status(404).json({ message: 'Order not found', error: true, success: false });
        }
        const me = await findUserById(request.userId);
        if (order.userId !== request.userId && me?.role !== 'Admin') {
            return response.status(403).json({ message: 'Permission denied', error: true, success: false });
        }
        return response.json({
            data: { html: order.invoiceReceipt || '' },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}
