/**
 * NPR ↔ USD conversion for storefront + admin.
 * Product prices are stored in NPR.
 * Display follows region (`USD` for US, `NPR` for Nepal).
 */

export const DEFAULT_USD_NPR_RATE = 133;

/**
 * @param {number} rate NPR per 1 USD
 */
export function normalizeUsdNprRate(rate) {
    const n = Number(rate);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_USD_NPR_RATE;
    return n;
}

export function normalizeCurrencyCode(code, fallback = 'USD') {
    const c = String(code || fallback).trim().toUpperCase();
    if (c === 'NPR' || c === 'NRS' || c === 'RS') return 'NPR';
    if (c === 'USD' || c === 'US$') return 'USD';
    return c || fallback;
}

/**
 * Convert an amount between USD and NPR (identity if same currency).
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @param {number} [usdNprRate] NPR per 1 USD
 */
export function convertCurrency(amount, from, to, usdNprRate = DEFAULT_USD_NPR_RATE) {
    const value = Number(amount) || 0;
    const src = normalizeCurrencyCode(from);
    const dest = normalizeCurrencyCode(to);
    if (src === dest) return Number(value.toFixed(2));

    const rate = normalizeUsdNprRate(usdNprRate);

    let inUsd = value;
    if (src === 'NPR') inUsd = value / rate;
    else if (src !== 'USD') {
        return Number(value.toFixed(2));
    }

    let out = inUsd;
    if (dest === 'NPR') out = inUsd * rate;
    else if (dest !== 'USD') return Number(value.toFixed(2));

    return Number(out.toFixed(2));
}

/** Convert a catalog NPR price into the shop display currency for the active region. */
export function toDisplayAmount(baseAmount, settings = {}) {
    const regionMode = String(settings.region_mode || settings.regionMode || 'us').toLowerCase();
    const rate = normalizeUsdNprRate(settings.usd_npr_rate ?? settings.usdNprRate);
    const value = Number(baseAmount) || 0;
    if (regionMode === 'nepal') return Number(value.toFixed(2));
    return Number((value / rate).toFixed(2));
}

/** Convert a display-currency amount back into catalog NPR. */
export function toBaseAmount(displayAmount, settings = {}) {
    const regionMode = String(settings.region_mode || settings.regionMode || 'us').toLowerCase();
    const rate = normalizeUsdNprRate(settings.usd_npr_rate ?? settings.usdNprRate);
    const value = Number(displayAmount) || 0;
    if (regionMode === 'nepal') return Number(value.toFixed(2));
    return Number((value * rate).toFixed(2));
}
