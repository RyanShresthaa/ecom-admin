/**
 * HTML bodies for order lifecycle emails (confirm, status, low stock) via config/sendEmail.js.
 */
import sendEmail from '../config/sendEmail.js';
import { logger } from './logger.js';

export function orderConfirmationHtml({ name, orderId, summary, currency = 'INR' }) {
    const rows = summary.lines
        .map(
            (l) =>
                `<tr><td>${l.product.name}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.lineTotal}</td></tr>`,
        )
        .join('');
    return `
    <h2>Order confirmed</h2>
    <p>Hi ${name},</p>
    <p>Thank you for your order <strong>${orderId}</strong>.</p>
    <table border="1" cellpadding="8" cellspacing="0">
      <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
      ${rows}
    </table>
    <p>Subtotal: ${summary.subtotal} ${currency}<br/>
    Coupon: -${summary.couponDiscount} ${currency}<br/>
    Tax: ${summary.taxAmt} ${currency}<br/>
    Shipping: ${summary.shippingAmt} ${currency}<br/>
    <strong>Total: ${summary.totalAmt} ${currency}</strong></p>
  `;
}

export function orderStatusHtml({ name, orderId, status }) {
    return `<h2>Order update</h2><p>Hi ${name},</p><p>Order <strong>${orderId}</strong> status: <strong>${status}</strong></p>`;
}

export function lowStockHtml({ name, products }) {
    const list = products.map((p) => `<li>${p.name} — ${p.stock} left</li>`).join('');
    return `<h2>Low stock alert</h2><p>Hi ${name},</p><ul>${list}</ul>`;
}

export async function sendOrderConfirmation({ user, orderId, summary }) {
    try {
        await sendEmail({
            sendTo: user.email,
            subject: `Order confirmed ${orderId}`,
            html: orderConfirmationHtml({ name: user.name, orderId, summary }),
        });
    } catch (e) {
        logger.warn('Order confirmation email failed', e.message);
    }
}

export async function sendOrderStatusEmail({ user, orderId, status }) {
    try {
        await sendEmail({
            sendTo: user.email,
            subject: `Order ${orderId} — ${status}`,
            html: orderStatusHtml({ name: user.name, orderId, status }),
        });
    } catch (e) {
        logger.warn('Order status email failed', e.message);
    }
}

export async function sendLowStockAlert({ seller, products }) {
    try {
        await sendEmail({
            sendTo: seller.email,
            subject: 'Low stock alert',
            html: lowStockHtml({ name: seller.name, products }),
        });
    } catch (e) {
        logger.warn('Low stock email failed', e.message);
    }
}
