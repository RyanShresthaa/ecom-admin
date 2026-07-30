/**
 * Web push subscribe / unsubscribe / VAPID public key.
 */
import {
    getVapidPublicKey,
    isWebPushConfigured,
    savePushSubscription,
    removePushSubscription,
} from '../utils/webPush.js';
import { getUserAgent } from '../utils/requestMeta.js';
import { findUserById, updateUser } from '../models/user.model.js';
import { normalizeNotificationPrefs } from '../utils/notificationPrefs.js';
import { deleteAllPushSubscriptionsForUser } from '../models/pushSubscription.model.js';

export async function getVapidPublicKeyController(_req, res) {
    const key = getVapidPublicKey();
    return res.json({
        error: false,
        success: true,
        data: {
            publicKey: key,
            configured: isWebPushConfigured(),
        },
    });
}

export async function subscribePushController(req, res) {
    try {
        if (!isWebPushConfigured()) {
            return res.status(503).json({
                message:
                    'Web push is not configured on the server. Set WEB_PUSH_VAPID_* env vars.',
                error: true,
                success: false,
            });
        }
        const subscription = req.body?.subscription || req.body;
        await savePushSubscription(req.userId, subscription, getUserAgent(req));

        const user = await findUserById(req.userId);
        const prefs = normalizeNotificationPrefs(user?.notification_prefs);
        if (!prefs.pushNotifications) {
            await updateUser(req.userId, {
                notification_prefs: { ...prefs, pushNotifications: true },
            });
        }

        return res.json({
            message: 'Push subscription saved',
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(400).json({ message: e.message || e, error: true, success: false });
    }
}

export async function unsubscribePushController(req, res) {
    try {
        const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
        if (endpoint) {
            await removePushSubscription(req.userId, endpoint);
        } else {
            await deleteAllPushSubscriptionsForUser(req.userId);
        }
        return res.json({ message: 'Push subscription removed', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message || e, error: true, success: false });
    }
}
