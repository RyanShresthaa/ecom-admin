/**
 * Shop settings (`shop_settings` table) — public map + admin bulk update.
 */
import { getAllSettings, getShopSettingsMap, upsertSetting } from '../../shared/models/settings.model.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import Stripe from '../../shared/config/stripe.js';
import { isMockPaymentAllowed } from '../../shared/config/payments.js';

function maskStripeKey(key) {
    const k = String(key || '').trim();
    if (!k) return null;
    if (k.length <= 8) return '••••';
    return `${k.slice(0, 7)}••••${k.slice(-4)}`;
}

function stripeKeyMode(secretKey) {
    const k = String(secretKey || '');
    if (k.startsWith('sk_live_')) return 'live';
    if (k.startsWith('sk_test_')) return 'test';
    if (k) return 'unknown';
    return null;
}

// GET /api/shop/settings — returns public store settings for checkout.
export async function getPublicSettingsController(_req, res) {
    try {
        const data = await getShopSettingsMap();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/shop/settings/admin — returns full settings for admin/staff.
export async function getAdminSettingsController(_req, res) {
    try {
        const data = await getAllSettings();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/shop/payments/status — Stripe connection status for admin (no secrets exposed).
export async function getPaymentStatusController(_req, res) {
    try {
        const secretKey = process.env.STRIPE_SECRET_KEY || '';
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        const settings = await getShopSettingsMap();
        const currency = String(process.env.STRIPE_CURRENCY || settings.currency || 'usd').toLowerCase();
        const keyMode = stripeKeyMode(secretKey);
        const stripeConfigured = Boolean(Stripe && secretKey);
        const mockAllowed = isMockPaymentAllowed();

        let status = 'disabled';
        if (stripeConfigured) {
            status = keyMode === 'live' ? 'live' : 'test';
        } else if (mockAllowed) {
            status = 'mock';
        }

        return res.json({
            data: {
                provider: 'stripe',
                status,
                stripeConfigured,
                mockAllowed,
                webhookConfigured: Boolean(webhookSecret),
                currency,
                secretKeyHint: maskStripeKey(secretKey),
                checkoutFlow: 'stripe_checkout',
                envVars: [
                    { name: 'STRIPE_SECRET_KEY', configured: Boolean(secretKey) },
                    { name: 'STRIPE_WEBHOOK_SECRET', configured: Boolean(webhookSecret) },
                    { name: 'STRIPE_CURRENCY', configured: Boolean(process.env.STRIPE_CURRENCY) },
                ],
                links: {
                    dashboard: 'https://dashboard.stripe.com',
                    apiKeys: 'https://dashboard.stripe.com/apikeys',
                    webhooks: 'https://dashboard.stripe.com/webhooks',
                    docs: 'https://stripe.com/docs/checkout',
                },
            },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/shop/settings — updates tax, shipping, and store settings.
export async function updateSettingsController(req, res) {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ message: 'settings object required', error: true, success: false });
        }
        for (const [key, value] of Object.entries(settings)) {
            await upsertSetting(key, value);
        }
        await logAudit({
            adminId: req.userId,
            action: 'settings.update',
            entityType: 'settings',
            details: settings,
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Settings updated', data: await getShopSettingsMap(), error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

