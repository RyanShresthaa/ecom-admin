/**
 * Shop settings (`shop_settings` table) — public map + admin bulk update.
 * Switching `region_mode` applies US / Nepal presets (currency, tax, timezone, shipping).
 */
import { getAllSettings, getShopSettingsMap, upsertSetting } from '../models/settings.model.js';
import { logAudit } from '../models/audit.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { getRegionPreset, normalizeRegionMode } from '../utils/regionPresets.js';

export async function getPublicSettingsController(_req, res) {
    try {
        const data = await getShopSettingsMap();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getAdminSettingsController(_req, res) {
    try {
        const data = await getAllSettings();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateSettingsController(req, res) {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ message: 'settings object required', error: true, success: false });
        }

        let payload = { ...settings };
        if (payload.region_mode != null) {
            const mode = normalizeRegionMode(payload.region_mode);
            const preset = getRegionPreset(mode);
            // Preset first, then explicit overrides from the same save win
            payload = { ...preset, ...payload, region_mode: mode };
        }

        for (const [key, value] of Object.entries(payload)) {
            await upsertSetting(key, value);
        }
        await logAudit({
            adminId: req.userId,
            action: 'settings.update',
            entityType: 'settings',
            details: payload,
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({
            message: 'Settings updated',
            data: await getShopSettingsMap(),
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
