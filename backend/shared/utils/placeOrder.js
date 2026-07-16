/**
 * Order persistence: atomic stock decrement + order rows + invoice HTML.
 * Called from controllers/order.controller.js processCheckout
 */
import crypto from 'crypto';
import pool from '../config/connectDB.js';
import { pickId } from './sql.js';
import { incrementCouponUseInTransaction } from '../models/coupon.model.js';
import { sendOrderConfirmation } from './orderEmails.js';
import { buildInvoicePayload, invoiceToHtml } from './invoice.js';
import { checkLowStockForProducts } from './stockAlerts.js';
import { logger } from './logger.js';
import { decrementStock } from './orderStock.js';
import { decrementVariantStock } from '../models/variant.model.js';
import { syncProductStockFromVariants } from '../services/catalog/index.js';

// Generate unique order identifiers for checkout and fulfillment workflows.
export const newOrderId = () => `ORD-${crypto.randomBytes(8).toString('hex')}`;

// Build per-seller order rows from checkout summary and payment details.
export function buildOrderRowsFromSummary(userId, addressId, summary, paymentId, payment_status) {
    const orderId = newOrderId();
    return summary.lines.map((line) => ({
        userId,
        orderId,
        productId: line.productId,
        variantId: line.variantId || null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        product_details: {
            name: line.product.name,
            image: line.variant?.image || line.product.image,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            variantId: line.variantId || null,
            size: line.variant?.size || null,
            color: line.variant?.color || null,
            sku: line.variant?.sku || line.product.sku || null,
        },
        paymentId: paymentId || '',
        payment_status: payment_status || '',
        delivery_address: addressId,
        subTotalAmt: summary.subtotal,
        totalAmt: summary.totalAmt,
        taxAmt: summary.taxAmt,
        shippingAmt: summary.shippingAmt,
        couponCode: summary.couponCode,
        couponDiscount: summary.couponDiscount,
    }));
}

function aggregateQtyByProduct(rows) {
    const map = new Map();
    // Persist each seller-specific order row and reserve corresponding stock.
    for (const row of rows) {
        const id = pickId(row.productId);
        map.set(id, (map.get(id) || 0) + row.quantity);
    }
    return map;
}

function aggregateQtyByVariant(rows) {
    const map = new Map();
    // Persist each seller-specific order row and reserve corresponding stock.
    for (const row of rows) {
        const vid = pickId(row.variantId);
        if (!vid) continue;
        map.set(vid, (map.get(vid) || 0) + row.quantity);
    }
    return map;
}

// Insert order rows and reserve stock atomically within a transaction.
export async function insertOrdersWithStock(rows, { couponCode } = {}) {
    const variantRows = rows.filter((r) => pickId(r.variantId));
    const plainRows = rows.filter((r) => !pickId(r.variantId));
    const qtyByProductPlain = aggregateQtyByProduct(plainRows);
    const qtyByVariant = aggregateQtyByVariant(variantRows);
    const client = await pool.connect();
    try {
        // Wrap order persistence and stock reservations in a single transaction.
        await client.query('BEGIN');
        // Non-variant lines: classic warehouse FIFO decrement
        if (qtyByProductPlain.size) {
            await decrementStock(client, qtyByProductPlain);
        }
        // Variant lines: decrement variant.stock, then set parent aggregate = SUM(variants)
        if (qtyByVariant.size) {
            await decrementVariantStock(client, qtyByVariant);
            const productIds = [...new Set(variantRows.map((r) => pickId(r.productId)))];
            for (const pid of productIds) {
                await syncProductStockFromVariants(pid, client);
            }
        }
        if (couponCode) {
            await incrementCouponUseInTransaction(client, couponCode);
        }

        const created = [];
        const invoiceHtml = rows[0]
            ? invoiceToHtml(
                  buildInvoicePayload({
                      orderId: rows[0].orderId,
                      user: { name: '', email: '' },
                      summary: {
                          lines: rows.map((r) => ({
                              product: { name: r.product_details.name },
                              quantity: r.quantity,
                              unitPrice: r.unitPrice,
                              lineTotal: r.lineTotal,
                          })),
                          subtotal: rows[0].subTotalAmt,
                          totalAmt: rows[0].totalAmt,
                          taxAmt: rows[0].taxAmt,
                          shippingAmt: rows[0].shippingAmt,
                          couponDiscount: rows[0].couponDiscount,
                          couponCode: rows[0].couponCode,
                      },
                      paymentStatus: rows[0].payment_status,
                  }),
              )
            : '';

        // Persist each seller-specific order row and reserve corresponding stock.
        for (const row of rows) {
            const r = await client.query(
                `INSERT INTO orders (
                    user_id, order_id, product_id, variant_id, product_details, payment_id, payment_status,
                    delivery_status, delivery_address, sub_total_amt, total_amt, quantity, unit_price,
                    line_total, tax_amt, shipping_amt, coupon_code, coupon_discount, invoice_receipt
                 ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
                [
                    row.userId,
                    row.orderId,
                    pickId(row.productId),
                    pickId(row.variantId) || null,
                    JSON.stringify(row.product_details || {}),
                    row.paymentId || '',
                    row.payment_status || '',
                    row.delivery_status || 'Pending',
                    pickId(row.delivery_address),
                    row.subTotalAmt ?? 0,
                    row.totalAmt ?? 0,
                    row.quantity,
                    row.unitPrice,
                    row.lineTotal,
                    row.taxAmt ?? 0,
                    row.shippingAmt ?? 0,
                    row.couponCode || null,
                    row.couponDiscount ?? 0,
                    invoiceHtml,
                ],
            );
            created.push(r.rows[0]);
        }
        await client.query('COMMIT');
        return created;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Finalize a successful checkout into persisted order records and notifications.
export async function finalizeOrder({ user, address: _address, summary, rows }) {
    summary.currency = summary.settings?.currency || summary.currency || 'NPR';
    const orderId = rows[0]?.order_id || rows[0]?.orderId;
    await sendOrderConfirmation({ user, orderId, summary });
    const productIds = summary.lines.map((l) => l.productId);
    try {
        const { isQueueEnabled } = await import('../queue/connection.js');
        if (isQueueEnabled()) {
            const { queueLowStockCheck } = await import('../queue/enqueue.js');
            queueLowStockCheck(productIds).catch((e) => logger.warn('Low stock queue', e.message));
        } else {
            checkLowStockForProducts(productIds).catch((e) => logger.warn('Low stock check', e.message));
        }
    } catch (e) {
        checkLowStockForProducts(productIds).catch((err) => logger.warn('Low stock check', err.message));
    }

    // Scale hooks (no-op when feature flags are off)
    try {
        const { earnPointsForOrder } = await import('../services/loyalty/index.js');
        await earnPointsForOrder(user?.id || user?.userId, summary.totalAmt, orderId);
    } catch (e) {
        logger.warn('Loyalty earn skipped', e.message);
    }
    try {
        const { recordEarningsForOrderRows } = await import('../services/payouts/index.js');
        await recordEarningsForOrderRows(rows, summary.currency);
    } catch (e) {
        logger.warn('Seller earnings skipped', e.message);
    }
}
