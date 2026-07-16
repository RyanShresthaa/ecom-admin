/**
 * Multi-currency FX — convert using fx_rates table (manual rates by default).
 */
import pool from '../../config/connectDB.js';
import { mapRows } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import { getShopSettingsMap } from '../../models/settings.model.js';

// List configured FX rates for admin management screens.
export async function listFxRates() {
    const r = await pool.query(`SELECT * FROM fx_rates ORDER BY base_currency, quote_currency`);
    return mapRows(r.rows).map((row) => ({
        ...row,
        rate: Number(row.rate),
    }));
}

// Insert or update one base/quote FX rate pair.
export async function upsertFxRate({ baseCurrency, quoteCurrency, rate, source = 'manual' }) {
    const r = await pool.query(
        `INSERT INTO fx_rates (base_currency, quote_currency, rate, source, as_of)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (base_currency, quote_currency) DO UPDATE SET
            rate = EXCLUDED.rate, source = EXCLUDED.source, as_of = NOW()
         RETURNING *`,
        [
            String(baseCurrency).toUpperCase(),
            String(quoteCurrency).toUpperCase(),
            Number(rate),
            source,
        ],
    );
    return { ...r.rows[0], rate: Number(r.rows[0].rate) };
}

// Resolve conversion rate, including inverse pair fallback.
export async function getRate(base, quote) {
    const b = String(base).toUpperCase();
    const q = String(quote).toUpperCase();
    if (b === q) return 1;
    const r = await pool.query(
        `SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2`,
        [b, q],
    );
    if (r.rows[0]) return Number(r.rows[0].rate);
    // try inverse
    const inv = await pool.query(
        `SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2`,
        [q, b],
    );
    if (inv.rows[0]) return 1 / Number(inv.rows[0].rate);
    return null;
}

// Convert a raw amount between two currencies using stored rates.
export async function convertAmount(amount, fromCurrency, toCurrency) {
    const rate = await getRate(fromCurrency, toCurrency);
    if (rate == null) {
        const err = new Error(`No FX rate for ${fromCurrency} → ${toCurrency}`);
        err.status = 400;
        throw err;
    }
    const converted = Number((Number(amount) * rate).toFixed(2));
    return { amount: Number(amount), fromCurrency, toCurrency, rate, converted };
}

// Convert storefront amounts only when multi-currency flag is enabled.
export async function convertForDisplay(amount, toCurrency) {
    if (!(await isEnabled('multi_currency'))) {
        const settings = await getShopSettingsMap();
        return {
            amount: Number(amount),
            currency: settings.currency || 'NPR',
            converted: Number(amount),
            toCurrency: settings.currency || 'NPR',
            rate: 1,
            featureEnabled: false,
        };
    }
    const settings = await getShopSettingsMap();
    const from = settings.currency || 'NPR';
    const to = String(toCurrency || from).toUpperCase();
    const result = await convertAmount(amount, from, to);
    return { ...result, featureEnabled: true, shopCurrency: from };
}
