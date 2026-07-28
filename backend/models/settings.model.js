/**
 * PostgreSQL: `shop_settings` key/value store (tax, shipping, currency, region).
 */
import pool from '../config/connectDB.js';
import { REGION_PRESETS } from '../utils/regionPresets.js';
import { setCachedRegionMode } from '../utils/regionModeCache.js';

const DEFAULTS = {
    region_mode: 'us',
    ...REGION_PRESETS.us,
    company_vat_pan: '',
    company_legal_name: '',
};

function parseValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch {
        return val;
    }
}

export async function getShopSettingsMap() {
    const r = await pool.query(`SELECT key, value FROM shop_settings`);
    const map = { ...DEFAULTS };
    for (const row of r.rows) {
        const v = parseValue(row.value);
        map[row.key] = typeof v === 'string' && !Number.isNaN(Number(v)) && v.trim() !== '' ? Number(v) : v;
        // Keep currency / region codes as strings even when numeric-looking
        if (
            [
                'currency',
                'tax_region',
                'region_mode',
                'admin_timezone',
                'purchase_default_currency',
                'price_base_currency',
                'company_vat_pan',
                'company_legal_name',
            ].includes(row.key)
        ) {
            map[row.key] = typeof v === 'number' ? String(v) : v;
        }
    }
    setCachedRegionMode(map.region_mode);
    return map;
}

export async function getAllSettings() {
    const r = await pool.query(`SELECT key, value, updated_at FROM shop_settings ORDER BY key`);
    return r.rows.map((row) => ({
        key: row.key,
        value: parseValue(row.value),
        updatedAt: row.updated_at,
    }));
}

export async function upsertSetting(key, value) {
    await pool.query(
        `INSERT INTO shop_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
        [key, JSON.stringify(value)],
    );
}
