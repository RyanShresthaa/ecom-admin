/**
 * HTML bodies for order lifecycle emails (confirm, status, low stock).
 * Prefer email_queue so request paths never wait on SMTP.
 */
import { queueTransactionalEmail } from './emailQueue.js';
import { logger } from './logger.js';
import { wantsOrderEmails } from './notificationPrefs.js';
import { notifyOrderPlaced, notifyOrderUpdate } from './notifyChannels.js';

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
    if (wantsOrderEmails(user)) {
        try {
            await queueTransactionalEmail({
                sendTo: user.email,
                subject: `Order confirmed ${orderId}`,
                html: orderConfirmationHtml({ name: user.name, orderId, summary }),
            });
        } catch (e) {
            logger.warn('Order confirmation email failed', e.message);
        }
    }
    await notifyOrderPlaced({
        user,
        orderId,
        totalAmt: summary?.totalAmt,
    }).catch((e) => logger.warn('Order placed channel notify failed', e.message));
}

export async function sendOrderStatusEmail({ user, orderId, status }) {
    if (wantsOrderEmails(user)) {
        try {
            await queueTransactionalEmail({
                sendTo: user.email,
                subject: `Order ${orderId} — ${status}`,
                html: orderStatusHtml({ name: user.name, orderId, status }),
            });
        } catch (e) {
            logger.warn('Order status email failed', e.message);
        }
    }
    await notifyOrderUpdate({ user, orderId, status }).catch((e) =>
        logger.warn('Order status channel notify failed', e.message),
    );
}

export async function sendLowStockAlert({ seller, products }) {
    try {
        await queueTransactionalEmail({
            sendTo: seller.email,
            subject: 'Low stock alert',
            html: lowStockHtml({ name: seller.name, products }),
        });
    } catch (e) {
        logger.warn('Low stock email failed', e.message);
    }
}

export function returnDecisionHtml({ name, orderId, status, resolution, adminNote }) {
    const decision = String(status || '').toLowerCase() === 'approved' ? 'approved' : 'declined';
    const resLabel =
        resolution === 'exchange'
            ? 'replacement (same item)'
            : resolution === 'damaged'
              ? 'damaged item replacement'
              : 'refund';
    const noteBlock = adminNote
        ? `<p><strong>Message from our team:</strong><br/>${String(adminNote).replace(/</g, '&lt;')}</p>`
        : '';
    return `
    <h2>Return request ${decision}</h2>
    <p>Hi ${name || 'there'},</p>
    <p>Your return request for order <strong>${orderId}</strong> (${resLabel}) was <strong>${decision}</strong>.</p>
    ${noteBlock}
    <p>You can review details anytime under My Orders.</p>
  `;
}

/** Email + SMS/push when admin approves or rejects a return. */
export async function sendReturnDecisionNotification({
    user,
    orderId,
    status,
    resolution,
    adminNote,
}) {
    if (!user?.email && !user?.id) return;
    const decision = String(status || '').toLowerCase() === 'approved' ? 'approved' : 'declined';
    const subject = `Return request ${decision} — ${orderId || 'your order'}`;

    if (wantsOrderEmails(user) && user.email) {
        try {
            await queueTransactionalEmail({
                sendTo: user.email,
                subject,
                html: returnDecisionHtml({
                    name: user.name,
                    orderId: orderId || 'your order',
                    status,
                    resolution,
                    adminNote,
                }),
            });
        } catch (e) {
            logger.warn('Return decision email failed', e.message);
        }
    }

    await notifyOrderUpdate({
        user,
        orderId: orderId || 'return',
        status: adminNote
            ? `Return ${decision}: ${adminNote}`
            : `Return ${decision}`,
    }).catch((e) => logger.warn('Return decision channel notify failed', e.message));
}
