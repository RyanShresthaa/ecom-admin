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

export const newOrderId = () => `ORD-${crypto.randomBytes(8).toString('hex')}`;

export function buildOrderRowsFromSummary(userId, addressId, summary, paymentId, payment_status) {
    const orderId = newOrderId();
    return summary.lines.map((line) => ({
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

function aggregateQty(rows) {
    const map = new Map();
    for (const row of rows) {
        const id = pickId(row.productId);
        map.set(id, (map.get(id) || 0) + row.quantity);
    }
    return map;
}

export async function insertOrdersWithStock(rows, { couponCode } = {}) {
    const qtyByProduct = aggregateQty(rows);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await decrementStock(client, qtyByProduct);
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

        for (const row of rows) {
            const r = await client.query(
                `INSERT INTO orders (
                    user_id, order_id, product_id, product_details, payment_id, payment_status,
                    delivery_status, delivery_address, sub_total_amt, total_amt, quantity, unit_price,
                    line_total, tax_amt, shipping_amt, coupon_code, coupon_discount, invoice_receipt
                 ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
                [
                    row.userId,
                    row.orderId,
                    pickId(row.productId),
                    JSON.stringify(row.product_details || {}),
                    row.paymentId || '',
                    row.payment_status || '',
                    row.delivery_status || 'pending',
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

export async function finalizeOrder({ user, address: _address, summary, rows }) {
    summary.currency = summary.settings?.currency || 'INR';
    const orderId = rows[0]?.order_id || rows[0]?.orderId;
    await sendOrderConfirmation({ user, orderId, summary });
    const productIds = summary.lines.map((l) => l.productId);
    checkLowStockForProducts(productIds).catch((e) => logger.warn('Low stock check', e.message));
}
