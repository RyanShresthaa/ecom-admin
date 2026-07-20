/**
 * Order & checkout HTTP handlers for `/api/order`. Totals from `resolveCheckoutLines` / `pricing.js`;
 * persistence + stock in `placeOrder.js`. Never trust client `totalAmt`.
 */
import Stripe from '../../shared/config/stripe.js';
import { clearCart } from '../../shared/models/cartproduct.model.js';
import {
    mapOrder,
    findOrdersByUser,
    findAllOrders,
    findAdminOrderGroups,
    findOrdersByOrderGroupId,
    findOrderLinesByProductId,
    findSalesSeries,
    updateOrder,
    findOrderById,
    findOrdersByPaymentId,
} from '../../shared/models/order.model.js';
import { restoreStock, decrementStock } from '../../shared/utils/orderStock.js';
import pool from '../../shared/config/connectDB.js';
import { bustCache } from '../../shared/utils/responseCache.js';
import { findUserById } from '../../shared/models/user.model.js';
import { findAddressByIdAndUser } from '../../shared/models/address.model.js';
import { findProductById } from '../../shared/models/product.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { resolveCheckoutLines } from '../../shared/utils/checkout.js';
import { buildOrderRowsFromSummary, insertOrdersWithStock, finalizeOrder, newOrderId } from '../../shared/utils/placeOrder.js';
import { unitPriceAfterDiscount } from '../../shared/utils/pricing.js';
import { sendOrderStatusEmail } from '../../shared/utils/orderEmails.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { isMockPaymentAllowed, MOCK_PAYMENT_DISABLED_MSG } from '../../shared/config/payments.js';
import { withCheckoutIdempotency } from '../../shared/utils/checkoutIdempotency.js';
import { addOrderNote, listNotesForOrderGroup } from '../../shared/models/orderNotes.model.js';
import { queueNotification } from '../../shared/queue/enqueue.js';
import { addStockInTransaction } from '../../shared/utils/inventoryStock.js';
import {
    resolvePairedStatuses,
    isReturnLikeState,
} from '../../shared/services/payments/index.js';
import { incrementVariantStock, decrementVariantStock } from '../../shared/models/variant.model.js';
import { syncProductStockFromVariants } from '../../shared/services/catalog/index.js';
import {
    assertDeliveryTransition,
    fulfillmentTimestamps,
    listAllowedTransitions,
    applyTracking,
    applyExpectedDelivery,
    reorderToCart,
    DELIVERY_STATUS_LIST,
    CARRIERS,
} from '../../shared/services/fulfillment/index.js';

export const pricewithDiscount = (price, dis = 1) => unitPriceAfterDiscount(price, dis);

async function runCheckout(request, { paymentId, payment_status }) {
    const userId = request.userId;
    const { list_items, addressId, couponCode, useCart } = request.body;
    if (!addressId) {
        const err = new Error('addressId is required');
        err.status = 400;
        throw err;
    }
    const address = await findAddressByIdAndUser(pickId(addressId), userId);
    if (!address) {
        const err = new Error('Invalid delivery address');
        err.status = 400;
        throw err;
    }

    const { summary, coupon, settings } = await resolveCheckoutLines({
        userId,
        list_items,
        couponCode,
        useCart: useCart === true || !list_items?.length,
        addressId,
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

function checkoutErrorStatus(error) {
    if (error.status) return error.status;
    const msg = error.message || String(error);
    return /stock|not found|not available|coupon|cart|empty|addressId/i.test(msg) ? 400 : 500;
}

/** Cash / COD — payment_id stored as CASH for admin payment-method display. */
// POST /api/order/place-cod — places a cash-on-delivery order.
export async function CashOnDeliveryOrderController(request, response) {
    try {
        const { status, body } = await withCheckoutIdempotency(request, () =>
            runCheckout(request, { paymentId: 'CASH', payment_status: 'CASH ON DELIVERY' }),
        );
        return response.status(status).json(body);
    } catch (error) {
        const status = checkoutErrorStatus(error);
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

function checkoutCurrency(settings) {
    const raw = String(settings?.currency || process.env.STRIPE_CURRENCY || 'inr').trim().toLowerCase();
    return raw || 'inr';
}

function stripeListSnapshot(summary) {
    const list = summary.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
    }));
    const json = JSON.stringify(list);
    return json.length <= 450 ? json : '';
}

/**
 * Stripe / card checkout: create Checkout Session (or mock-paid order when Stripe unset + mock allowed).
 * Client must call confirm-stripe after redirect when using a real session.
 */
// POST /api/order/place-online — initializes online checkout payment flow.
export async function paymentController(request, response) {
    try {
        const userId = request.userId;
        const { list_items, addressId, couponCode, useCart } = request.body;
        if (!addressId) {
            return response.status(400).json({ message: 'addressId is required', error: true, success: false });
        }
        const address = await findAddressByIdAndUser(pickId(addressId), userId);
        if (!address) {
            return response.status(400).json({ message: 'Invalid delivery address', error: true, success: false });
        }

        const { summary, coupon, settings } = await resolveCheckoutLines({
            userId,
            list_items,
            couponCode,
            useCart: useCart === true || !list_items?.length,
            addressId,
        });

        if (!Stripe) {
            if (!isMockPaymentAllowed()) {
                return response.status(503).json({
                    message: MOCK_PAYMENT_DISABLED_MSG,
                    error: true,
                    success: false,
                });
            }
            const { status, body } = await withCheckoutIdempotency(request, () =>
                runCheckout(request, {
                    paymentId: `STRIPE-MOCK-${Date.now()}`,
                    payment_status: 'PAID',
                }),
            );
            return response.status(status).json({ ...body, paymentMethod: 'stripe' });
        }

        const user = await findUserById(userId);
        const currency = checkoutCurrency(settings);
        const listJson = stripeListSnapshot(summary);
        const line_items = summary.lines.map((item) => ({
            price_data: {
                currency,
                product_data: {
                    name: item.product.name,
                    images: item.product.image,
                    metadata: { productId: String(item.productId) },
                },
                unit_amount: Math.round(item.unitPrice * 100),
            },
            quantity: item.quantity,
        }));

        const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5174';
        const session = await Stripe.checkout.sessions.create({
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: user.email,
            metadata: {
                paymentMethod: 'stripe',
                userId: String(userId),
                addressId: String(pickId(addressId)),
                couponCode: coupon?.code || '',
                list_items: listJson,
                useCart: listJson ? '0' : '1',
            },
            line_items,
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/cancel`,
        });
        return response.status(200).json({
            id: session.id,
            url: session.url,
            paymentMethod: 'stripe',
            pricing: summary,
        });
    } catch (error) {
        const msg = error.message || String(error);
        const status = /stock|not found|not available|coupon|cart/i.test(msg) ? 400 : 500;
        return response.status(status).json({ message: msg, error: true, success: false });
    }
}

/**
 * Unified customer checkout: body.paymentMethod = "cash" | "stripe".
 * cash → place order unpaid (CASH); stripe → Checkout Session (or mock paid).
 */
// POST /api/order/place — places order using unified payment method payload.
export async function placeOrderController(request, response) {
    const method = String(request.body?.paymentMethod || '').toLowerCase();
    if (method === 'cash') {
        return CashOnDeliveryOrderController(request, response);
    }
    if (method === 'stripe') {
        return paymentController(request, response);
    }
    return response.status(400).json({
        message: 'paymentMethod must be "cash" or "stripe"',
        error: true,
        success: false,
    });
}

/**
 * After Stripe Checkout success redirect: verify session paid, then create order.
 * Body: { sessionId }. Idempotent on payment_intent / session id.
 */
// POST /api/order/confirm-stripe — confirms Stripe session and creates paid order.
export async function confirmStripeCheckoutController(request, response) {
    try {
        if (!Stripe) {
            return response.status(503).json({
                message: 'Stripe is not configured',
                error: true,
                success: false,
            });
        }

        const sessionId = String(request.body?.sessionId || '').trim();
        if (!sessionId) {
            return response.status(400).json({ message: 'sessionId is required', error: true, success: false });
        }

        const session = await Stripe.checkout.sessions.retrieve(sessionId);
        if (!session || session.mode !== 'payment') {
            return response.status(400).json({ message: 'Invalid Stripe session', error: true, success: false });
        }
        if (session.payment_status !== 'paid') {
            return response.status(402).json({
                message: 'Payment not completed',
                error: true,
                success: false,
                payment_status: session.payment_status,
            });
        }

        const meta = session.metadata || {};
        const sessionUserId = Number(meta.userId);
        if (!sessionUserId || sessionUserId !== Number(request.userId)) {
            return response.status(403).json({ message: 'Session does not belong to this user', error: true, success: false });
        }

        const paymentKey = String(session.payment_intent || session.id);
        const existing = await findOrdersByPaymentId(paymentKey);
        if (existing.length) {
            return response.json({
                message: 'Order already confirmed',
                error: false,
                success: true,
                data: existing,
                paymentMethod: 'stripe',
                replayed: true,
            });
        }

        let list_items;
        if (meta.list_items) {
            try {
                list_items = JSON.parse(meta.list_items);
            } catch {
                list_items = undefined;
            }
        }

        const checkoutReq = {
            ...request,
            body: {
                addressId: meta.addressId,
                couponCode: meta.couponCode || undefined,
                list_items,
                useCart: meta.useCart === '1' || !list_items?.length,
            },
            headers: {
                ...request.headers,
                'idempotency-key': request.headers['idempotency-key'] || `stripe-${session.id}`,
            },
        };

        const { status, body } = await withCheckoutIdempotency(checkoutReq, () =>
            runCheckout(checkoutReq, {
                paymentId: paymentKey,
                payment_status: 'PAID',
            }),
        );
        return response.status(status).json({ ...body, paymentMethod: 'stripe' });
    } catch (error) {
        const status = checkoutErrorStatus(error);
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

// POST /api/order/preview-checkout — previews totals, shipping, and discounts before placing order.
export async function previewCheckoutController(request, response) {
    try {
        const { summary, settings } = await resolveCheckoutLines({
            userId: request.userId,
            list_items: request.body.list_items,
            couponCode: request.body.couponCode,
            useCart: request.body.useCart === true || !request.body.list_items?.length,
            addressId: request.body.addressId,
        });
        return response.json({
            data: { ...summary, currency: settings.currency },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(400).json({ message: error.message, error: true, success: false });
    }
}

// GET /api/order/my-orders — returns current user's order history.
export async function getOrderDetailsController(request, response) {
    try {
        const orderlist = await findOrdersByUser(request.userId);
        return response.json({ message: 'order list', data: orderlist, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// GET /api/order/all — lists all orders for staff/admin operations.
export async function getAllOrdersController(request, response) {
    try {
        // Skip per-line address hydration — list UIs don't need it and it was N+1 slow.
        const list = await findAllOrders({ includeAddress: false });
        return response.json({ message: 'all orders', data: list, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/admin-list — paginated grouped orders for staff tables */
// GET /api/order/admin-list — returns paginated admin order listing.
export async function getAdminOrderListController(request, response) {
    try {
        const src = { ...request.query, ...request.body };
        const result = await findAdminOrderGroups({
            page: Number(src.page) || 1,
            limit: Number(src.limit) || 10,
            search: src.search || '',
            deliveryStatus: src.delivery_status || src.deliveryStatus || '',
            paymentStatus: src.payment_status || src.paymentStatus || '',
            dateFrom: src.date_from || src.dateFrom || '',
            dateTo: src.date_to || src.dateTo || '',
            userId: src.user_id || src.userId || src.customerId || null,
        });
        return response.json({
            message: 'admin orders',
            data: result.data,
            totalCount: result.totalCount,
            page: result.page,
            limit: result.limit,
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/group/:orderId — lines for one checkout group */
// GET /api/order/group/:orderId — fetches grouped order rows by order id.
export async function getOrderGroupController(request, response) {
    try {
        const orderId = request.params.orderId;
        if (!orderId) {
            return response.status(400).json({ message: 'orderId required', error: true, success: false });
        }
        const list = await findOrdersByOrderGroupId(orderId);
        if (!list.length) {
            return response.status(404).json({ message: 'Order not found', error: true, success: false });
        }
        return response.json({ message: 'order group', data: list, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/sales-series?days=14 */
// GET /api/order/sales-series — returns sales trend metrics for admin dashboard.
export async function getSalesSeriesController(request, response) {
    try {
        const days = Number(request.query.days) || 14;
        const data = await findSalesSeries(days);
        return response.json({ data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/by-product/:productId */
// GET /api/order/by-product/:productId — lists orders containing a specific product.
export async function getOrdersByProductController(request, response) {
    try {
        const productId = request.params.productId;
        if (!productId) {
            return response.status(400).json({ message: 'productId required', error: true, success: false });
        }
        const list = await findOrderLinesByProductId(productId, {
            limit: Number(request.query.limit) || 500,
        });
        return response.json({ message: 'product orders', data: list, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

async function adjustStockForLine(previous, { restore }) {
    const productId = pickId(previous.productId);
    const variantId = pickId(previous.variantId || previous.variant_id || previous.product_details?.variantId);
    const qty = Math.max(1, Number(previous.quantity || previous.product_details?.quantity || 1));
    if (!productId || !qty) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (variantId) {
            if (restore) await incrementVariantStock(client, new Map([[variantId, qty]]));
            else await decrementVariantStock(client, new Map([[variantId, qty]]));
            await syncProductStockFromVariants(productId, client);
        } else {
            const map = new Map([[productId, qty]]);
            if (restore) await restoreStock(client, map);
            else await decrementStock(client, map);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// PUT /api/order/update-status — updates delivery/payment status workflow.
export async function updateOrderStatusController(request, response) {
    try {
        const {
            _id,
            delivery_status,
            payment_status,
            tracking_number,
            trackingNumber,
            carrier,
            skipTransitionCheck,
        } = request.body || {};
        if (!_id) {
            return response.status(400).json({ message: 'provide _id', error: true, success: false });
        }
        const orderId = pickId(_id);
        const previous = await findOrderById(orderId);
        if (!previous) {
            return response.status(404).json({ message: 'Order not found', error: true, success: false });
        }

        // Validate delivery FSM when staff changes delivery_status
        if (delivery_status != null && !skipTransitionCheck) {
            assertDeliveryTransition(
                previous.delivery_status || previous.deliveryStatus,
                delivery_status,
            );
        }

        const { nextDelivery, nextPayment, prevDelivery, prevPayment } = resolvePairedStatuses(previous, {
            delivery_status,
            payment_status,
        });

        const wasReturnLike = isReturnLikeState(prevDelivery, prevPayment);
        const isReturnLike = isReturnLikeState(nextDelivery, nextPayment);
        let stockRestored = Boolean(previous.stockRestored);

        if (isReturnLike && !stockRestored) {
            await adjustStockForLine(previous, { restore: true });
            stockRestored = true;
        } else if (!isReturnLike && wasReturnLike && stockRestored) {
            await adjustStockForLine(previous, { restore: false });
            stockRestored = false;
        }

        const ts = fulfillmentTimestamps(nextDelivery, previous);
        const trackNum =
            tracking_number !== undefined
                ? tracking_number
                : trackingNumber !== undefined
                  ? trackingNumber
                  : undefined;

        const updated = await updateOrder(orderId, {
            delivery_status: nextDelivery,
            payment_status: nextPayment,
            stock_restored: stockRestored,
            tracking_number: trackNum,
            carrier: carrier !== undefined ? carrier : undefined,
            ...ts,
        });

        if (nextDelivery && nextDelivery !== prevDelivery && previous.userId) {
            const user = await findUserById(previous.userId);
            if (user) {
                await sendOrderStatusEmail({
                    user,
                    orderId: previous.orderId,
                    status: nextDelivery,
                });
            }
        }

        bustCache('admin:stats');
        bustCache('products:');

        await logAudit({
            adminId: request.userId,
            action: 'order.status_update',
            entityType: 'order',
            entityId: orderId,
            details: {
                delivery_status: nextDelivery,
                payment_status: nextPayment,
                stock_restored: stockRestored,
                tracking_number: trackNum,
                carrier,
            },
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
        });

        return response.json({
            message: 'updated',
            data: updated,
            allowedNext: listAllowedTransitions(nextDelivery),
            error: false,
            success: true,
        });
    } catch (error) {
        const status = error.status || 500;
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/delivery-statuses — FSM reference for admin UI */
// GET /api/order/delivery-statuses — lists allowed delivery status transitions.
export async function listDeliveryStatusesController(_req, res) {
    return res.json({
        data: {
            statuses: DELIVERY_STATUS_LIST,
            carriers: CARRIERS,
        },
        error: false,
        success: true,
    });
}

/** PUT /api/order/tracking — set tracking on all lines in a group */
// PUT /api/order/tracking — updates shipment tracking details for an order.
export async function updateTrackingController(req, res) {
    try {
        const body = req.body || {};
        const updated = await applyTracking({
            orderGroupId: body.orderGroupId || body.orderId,
            orderRowId: body.orderRowId || body._id,
            trackingNumber: body.tracking_number ?? body.trackingNumber,
            carrier: body.carrier,
        });
        await logAudit({
            adminId: req.userId,
            action: 'order.tracking_update',
            entityType: 'order',
            entityId: updated[0]?.orderId || updated[0]?.id,
            details: {
                tracking_number: body.tracking_number ?? body.trackingNumber,
                carrier: body.carrier,
            },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Tracking updated', data: updated, error: false, success: true });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({ message: error.message, error: true, success: false });
    }
}

/** PUT /api/order/expected-delivery — admin sets ETA after Confirmed */
export async function updateExpectedDeliveryController(req, res) {
    try {
        const body = req.body || {};
        const expectedDeliveryAt =
            body.expectedDeliveryAt ?? body.expected_delivery_at ?? null;
        const updated = await applyExpectedDelivery({
            orderGroupId: body.orderGroupId || body.orderId,
            orderRowId: body.orderRowId || body._id,
            expectedDeliveryAt,
        });
        await logAudit({
            adminId: req.userId,
            action: 'order.expected_delivery_update',
            entityType: 'order',
            entityId: updated[0]?.orderId || updated[0]?.id,
            details: { expectedDeliveryAt },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({
            message: expectedDeliveryAt
                ? 'Expected delivery updated'
                : 'Expected delivery cleared',
            data: updated,
            error: false,
            success: true,
        });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({ message: error.message, error: true, success: false });
    }
}

/** POST /api/order/reorder — copy past order into cart */
// POST /api/order/reorder — rebuilds cart/order draft from a previous order.
export async function reorderController(req, res) {
    try {
        const body = req.body || {};
        const result = await reorderToCart({
            userId: req.userId,
            orderGroupId: body.orderGroupId || body.orderId,
            orderRowId: body.orderRowId || body._id,
        });
        return res.json({
            message: 'Items added to cart',
            data: result,
            error: false,
            success: true,
        });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({ message: error.message, error: true, success: false });
    }
}

// GET /api/order/invoice/:id — returns invoice data for an order.
export async function getInvoiceController(request, response) {
    try {
        const order = await findOrderById(pickId(request.params.id));
        if (!order) {
            return response.status(404).json({ message: 'Order not found', error: true, success: false });
        }
        const me = await findUserById(request.userId);
        if (order.userId !== request.userId && me?.role !== 'Admin' && me?.role !== 'Seller') {
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

/** Staff manual order (admin dashboard). */
// POST /api/order/admin-create — creates an order manually from admin panel.
export async function adminCreateOrderController(request, response) {
    try {
        const { customerId, items, paymentStatus, paymentMethod, deliveryStatus, note, author } = request.body || {};
        const userId = pickId(customerId);
        if (!userId || !Array.isArray(items) || !items.length) {
            return response.status(400).json({
                message: 'customerId and items are required',
                error: true,
                success: false,
            });
        }
        const customer = await findUserById(userId);
        if (!customer) {
            return response.status(404).json({ message: 'Customer not found', error: true, success: false });
        }

        const lines = [];
        let subtotal = 0;
        for (const item of items) {
            const product = await findProductById(pickId(item.productId));
            if (!product) {
                return response.status(400).json({
                    message: `Product not found: ${item.productId}`,
                    error: true,
                    success: false,
                });
            }
            const qty = Math.max(1, Number(item.qty || item.quantity || 1));
            const unitPrice = Number(product.price || 0);
            const lineTotal = Math.round(unitPrice * qty * 100) / 100;
            subtotal += lineTotal;
            lines.push({
                product,
                productId: product.id,
                quantity: qty,
                unitPrice,
                lineTotal,
            });
        }
        subtotal = Math.round(subtotal * 100) / 100;

        // Ensure warehouse stock covers the order (manual admin sales)
        for (const line of lines) {
            const available = Number(line.product.stock || 0)
            if (available < line.quantity) {
                const client = await pool.connect()
                try {
                    await client.query('BEGIN')
                    await addStockInTransaction(client, {
                        productId: line.productId,
                        quantity: line.quantity - available,
                        userId: request.userId,
                        reason: 'admin_order_prep',
                        note: 'Auto-stock for manual admin order',
                    })
                    await client.query('COMMIT')
                } catch (err) {
                    await client.query('ROLLBACK')
                    throw err
                } finally {
                    client.release()
                }
            }
        }

        const orderId = newOrderId();
        const rows = lines.map((line) => ({
            userId,
            orderId,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            product_details: {
                name: line.product.name,
                image: line.product.image,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
            },
            paymentId: String(paymentMethod || 'CASH').toUpperCase(),
            payment_status: paymentStatus || 'Paid',
            delivery_status: deliveryStatus || 'Pending',
            delivery_address: null,
            subTotalAmt: subtotal,
            totalAmt: subtotal,
            taxAmt: 0,
            shippingAmt: 0,
            couponCode: null,
            couponDiscount: 0,
        }));

        const created = await insertOrdersWithStock(rows);
        if (note?.trim()) {
            await addOrderNote({
                orderGroupId: orderId,
                text: note.trim(),
                author: author || request.user?.name || 'Staff',
            });
        }
        await queueNotification({
            type: 'order',
            title: 'New order created',
            message: `Order ${orderId} for ${customer.name || customer.email}`,
            href: `/orders/${orderId}`,
            dedupeKey: `order-created-${orderId}`,
        });
        const firstLineId = created[0]?.id ?? null
        await logAudit({
            adminId: request.userId,
            action: 'order.admin_create',
            entityType: 'order',
            entityId: firstLineId,
            details: { customerId: userId, orderGroupId: orderId, lines: lines.length },
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
        }).catch(() => {})

        return response.status(201).json({
            message: 'Order created',
            data: { id: orderId, orderId, lines: created.map(mapOrder) },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(400).json({ message: error.message || error, error: true, success: false });
    }
}

// GET /api/order/notes/:orderGroupId — lists internal notes for order group.
export async function listOrderNotesController(request, response) {
    try {
        const orderGroupId = request.params.orderGroupId || request.query.orderId;
        if (!orderGroupId) {
            return response.status(400).json({ message: 'orderId required', error: true, success: false });
        }
        const data = await listNotesForOrderGroup(orderGroupId);
        return response.json({ data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// POST /api/order/notes — adds an internal note to an order group.
export async function addOrderNoteController(request, response) {
    try {
        const orderGroupId = request.body?.orderId || request.body?.orderGroupId || request.params.orderGroupId;
        const text = String(request.body?.text || '').trim();
        if (!orderGroupId || !text) {
            return response.status(400).json({ message: 'orderId and text required', error: true, success: false });
        }
        const data = await addOrderNote({
            orderGroupId,
            text,
            author: request.body?.author || request.user?.name || 'Staff',
        });
        return response.status(201).json({ data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

