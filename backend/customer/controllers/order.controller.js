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
import { createNotification } from '../../shared/models/notification.model.js';
import { addStockInTransaction } from '../../shared/utils/inventoryStock.js';

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

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const { status, body } = await withCheckoutIdempotency(request, () =>
            runCheckout(request, { paymentId: '', payment_status: 'CASH ON DELIVERY' }),
        );
        return response.status(status).json(body);
    } catch (error) {
        const status = checkoutErrorStatus(error);
        return response.status(status).json({ message: error.message || error, error: true, success: false });
    }
}

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

        const { summary, coupon, settings: _settings } = await resolveCheckoutLines({
            userId,
            list_items,
            couponCode,
            useCart: useCart === true || !list_items?.length,
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
                    paymentId: `MOCK-${Date.now()}`,
                    payment_status: 'PAID',
                }),
            );
            return response.status(status).json(body);
        }

        const user = await findUserById(userId);
        const line_items = summary.lines.map((item) => ({
            price_data: {
                currency: 'inr',
                product_data: {
                    name: item.product.name,
                    images: item.product.image,
                    metadata: { productId: String(item.productId) },
                },
                unit_amount: Math.round(item.unitPrice * 100),
            },
            quantity: item.quantity,
        }));

        const session = await Stripe.checkout.sessions.create({
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: user.email,
            metadata: {
                userId: String(userId),
                addressId: String(pickId(addressId)),
                couponCode: coupon?.code || '',
            },
            line_items,
            success_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL}/cancel`,
        });
        return response.status(200).json({ ...session, pricing: summary });
    } catch (error) {
        const msg = error.message || String(error);
        const status = /stock|not found|not available|coupon|cart/i.test(msg) ? 400 : 500;
        return response.status(status).json({ message: msg, error: true, success: false });
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
        // Skip per-line address hydration — list UIs don't need it and it was N+1 slow.
        const list = await findAllOrders({ includeAddress: false });
        return response.json({ message: 'all orders', data: list, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** GET /api/order/admin-list — paginated grouped orders for staff tables */
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

const isCancelledStatus = (s) => /^cancel/i.test(String(s || ''));
const isReturnedStatus = (s) => /^returned$/i.test(String(s || ''));
const isRefundedStatus = (s) => /^refunded$/i.test(String(s || ''));
const isReturnLikeState = (delivery, payment) =>
    isReturnedStatus(delivery) || isRefundedStatus(payment) || isCancelledStatus(delivery);

async function adjustStockForLine(previous, { restore }) {
    const productId = pickId(previous.productId);
    const qty = Math.max(1, Number(previous.quantity || previous.product_details?.quantity || 1));
    if (!productId || !qty) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const map = new Map([[productId, qty]]);
        if (restore) await restoreStock(client, map);
        else await decrementStock(client, map);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Sync Returned ↔ Refunded, restore/re-reserve stock, keep cancel restore behavior.
 */
function resolvePairedStatuses(previous, { delivery_status, payment_status }) {
    const prevDelivery = previous?.delivery_status || previous?.deliveryStatus || '';
    const prevPayment = previous?.payment_status || previous?.paymentStatus || '';

    let nextDelivery = delivery_status != null ? delivery_status : prevDelivery;
    let nextPayment = payment_status != null ? payment_status : prevPayment;

    // Returned ↔ Refunded
    if (delivery_status != null && isReturnedStatus(delivery_status) && !isRefundedStatus(nextPayment)) {
        nextPayment = 'Refunded';
    }
    if (payment_status != null && isRefundedStatus(payment_status) && !isReturnedStatus(nextDelivery)) {
        nextDelivery = 'Returned';
    }

    // Leaving return/refund undoes the paired field when the other wasn't set explicitly
    if (
        delivery_status != null &&
        !isReturnedStatus(delivery_status) &&
        isReturnedStatus(prevDelivery) &&
        payment_status == null &&
        isRefundedStatus(nextPayment)
    ) {
        nextPayment = 'Paid';
    }
    if (
        payment_status != null &&
        !isRefundedStatus(payment_status) &&
        isRefundedStatus(prevPayment) &&
        delivery_status == null &&
        isReturnedStatus(nextDelivery)
    ) {
        nextDelivery = 'Delivered';
    }

    return { nextDelivery, nextPayment, prevDelivery, prevPayment };
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

        const updated = await updateOrder(orderId, {
            delivery_status: nextDelivery,
            payment_status: nextPayment,
            stock_restored: stockRestored,
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
            },
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
        });

        return response.json({ message: 'updated', data: updated, error: false, success: true });
    } catch (error) {
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
export async function adminCreateOrderController(request, response) {
    try {
        const { customerId, items, paymentStatus, deliveryStatus, note, author } = request.body || {};
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
            paymentId: 'ADMIN',
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
        await createNotification({
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
