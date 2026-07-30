/**
 * Fan-out order / account alerts to email (existing), SMS, and web push based on prefs.
 */
import { sendSms } from './sms.js';
import { sendPushToUser } from './webPush.js';
import { wantsSms, wantsPush } from './notificationPrefs.js';
import { logger } from './logger.js';

export async function notifyOrderUpdate({ user, orderId, status }) {
    if (!user?.id) return;

    const title = `Order ${orderId}`;
    const body = `Status update: ${status}`;

    if (wantsSms(user) && user.mobile) {
        await sendSms({
            to: user.mobile,
            body: `Matina Crafts: Order ${orderId} is now ${status}.`,
        }).catch((e) => logger.warn('[notify] SMS failed', e.message));
    }

    if (wantsPush(user)) {
        await sendPushToUser(user.id, {
            title,
            body,
            url: '/orders',
            tag: `order-${orderId}`,
        }).catch((e) => logger.warn('[notify] Push failed', e.message));
    }
}

export async function notifyOrderPlaced({ user, orderId, totalAmt }) {
    if (!user?.id) return;
    const body = `Thanks for your order ${orderId}${totalAmt != null ? ` · ${totalAmt}` : ''}`;

    if (wantsSms(user) && user.mobile) {
        await sendSms({
            to: user.mobile,
            body: `Matina Crafts: ${body}`,
        }).catch((e) => logger.warn('[notify] SMS failed', e.message));
    }

    if (wantsPush(user)) {
        await sendPushToUser(user.id, {
            title: 'Order confirmed',
            body,
            url: '/orders',
            tag: `order-${orderId}`,
        }).catch((e) => logger.warn('[notify] Push failed', e.message));
    }
}
