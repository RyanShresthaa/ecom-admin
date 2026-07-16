/**
 * Shop settings (`shop_settings` table) — public map + admin bulk update.
 */
import { getAllSettings, getShopSettingsMap, upsertSetting } from '../../shared/models/settings.model.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';

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

