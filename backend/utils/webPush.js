/**
 * Web Push (VAPID). Set WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY,
 * WEB_PUSH_SUBJECT (mailto: or https URL). Generate with: npx web-push generate-vapid-keys
 */
import webpush from 'web-push';
import { logger } from './logger.js';
import {
    upsertPushSubscription,
    deletePushSubscriptionByEndpoint,
    findPushSubscriptionsByUser,
    deletePushSubscriptionById,
} from '../models/pushSubscription.model.js';

let configured = false;

export function isWebPushConfigured() {
    return Boolean(
        process.env.WEB_PUSH_VAPID_PUBLIC_KEY &&
            process.env.WEB_PUSH_VAPID_PRIVATE_KEY &&
            process.env.WEB_PUSH_SUBJECT,
    );
}

function ensureWebPush() {
    if (configured) return isWebPushConfigured();
    if (!isWebPushConfigured()) return false;
    webpush.setVapidDetails(
        process.env.WEB_PUSH_SUBJECT,
        process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
        process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
    );
    configured = true;
    return true;
}

export function getVapidPublicKey() {
    return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || null;
}

export async function savePushSubscription(userId, subscription, userAgent) {
    const endpoint = subscription?.endpoint;
    const keys = subscription?.keys || {};
    if (!endpoint || !keys.p256dh || !keys.auth) {
        throw new Error('Invalid push subscription');
    }
    return upsertPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
    });
}

export async function removePushSubscription(userId, endpoint) {
    return deletePushSubscriptionByEndpoint(userId, endpoint);
}

export async function sendPushToUser(userId, payload) {
    if (!ensureWebPush()) {
        logger.info('[push] Web push not configured — skipping', { userId });
        return { ok: true, skipped: true, sent: 0 };
    }
    const subs = await findPushSubscriptionsByUser(userId);
    if (!subs.length) return { ok: true, sent: 0 };

    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sent = 0;
    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                body,
            );
            sent += 1;
        } catch (e) {
            const status = e?.statusCode;
            if (status === 404 || status === 410) {
                await deletePushSubscriptionById(sub.id).catch(() => {});
            } else {
                logger.warn('[push] send failed', { userId, status, message: e.message });
            }
        }
    }
    return { ok: true, sent };
}
