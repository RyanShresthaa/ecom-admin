// settings model: handles settings table/entity CRUD and query helpers.
/**
 * PostgreSQL: `shop_settings` key/value store (tax, shipping, currency).
 */
import pool from '../config/connectDB.js';

const DEFAULTS = {
    tax_percent: 13,
    flat_shipping_fee: 100,
    free_shipping_min: 1000,
    currency: 'INR',
    tax_region: 'NP',
    vat_standard_rate: 13,
    purchase_default_currency: 'NPR',
    company_vat_pan: '',
    company_legal_name: '',
};

// settings model: parseValue reads and returns records.
function parseValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch {
        return val;
    }
}

// settings model: getShopSettingsMap reads and returns records.
export async function getShopSettingsMap() {
    const r = await pool.query(`SELECT key, value FROM shop_settings`);
    const map = { ...DEFAULTS };
    for (const row of r.rows) {
        const v = parseValue(row.value);
        map[row.key] = typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : v;
    }
    return map;
}

// settings model: getAllSettings reads and returns records.
export async function getAllSettings() {
    const r = await pool.query(`SELECT key, value, updated_at FROM shop_settings ORDER BY key`);
    return r.rows.map((row) => ({
        key: row.key,
        value: parseValue(row.value),
        updatedAt: row.updated_at,
    }));
}

// settings model: upsertSetting runs model logic/query operations.
export async function upsertSetting(key, value) {
    await pool.query(
        `INSERT INTO shop_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
        [key, JSON.stringify(value)],
    );
}

