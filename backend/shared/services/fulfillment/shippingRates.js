/**
 * Resolve shipping fee from zones (city → state/district → country → default),
 * falling back to shop_settings flat_shipping_fee / free_shipping_min.
 */
import { listActiveRatesWithZones } from '../../models/shipping.model.js';
import { getShopSettingsMap } from '../../models/settings.model.js';
import { calcShipping } from '../../utils/pricing.js';

// Normalize location tokens for case-insensitive rate matching.
function norm(s) {
    return String(s || '')
        .trim()
        .toLowerCase();
}

/**
 * Pick the best matching rate row for an address.
 * @param {{ city?: string, state?: string, country?: string }} address
 * @param {object[]} rates - from listActiveRatesWithZones()
 */
export function matchShippingRate(address, rates) {
    // Match best rate in priority order: city -> state -> country -> default.
    if (!rates?.length) return null;
    const city = norm(address?.city);
    const state = norm(address?.state);
    const country = norm(address?.country);

    const find = (type, value) =>
        rates.find((r) => r.matchType === type && norm(r.matchValue) === value);

    return (
        (city && find('city', city)) ||
        (state && find('state', state)) ||
        (country && find('country', country)) ||
        rates.find((r) => r.matchType === 'default') ||
        null
    );
}

/**
 * @param {{ city?, state?, country? }|null} address
 * @param {number} subtotalAfterCoupon
 * @returns {Promise<{ amount: number, zoneName: string|null, rateId: number|null, freeMin: number|null, source: string }>}
 */
export async function resolveShippingRate(address, subtotalAfterCoupon) {
    // Resolve zone rate first, then fall back to global shop shipping settings.
    const settings = await getShopSettingsMap();
    const rates = await listActiveRatesWithZones();
    const matched = address ? matchShippingRate(address, rates) : null;

    if (matched) {
        const freeMin =
            matched.freeMin != null ? matched.freeMin : Number(settings.free_shipping_min) || 0;
        const amount = calcShipping(subtotalAfterCoupon, matched.rate, freeMin);
        return {
            amount,
            zoneName: matched.zoneName || null,
            rateId: matched.id,
            freeMin,
            flatFee: matched.rate,
            source: 'zone',
            currency: matched.currency || settings.currency || 'NPR',
        };
    }

    // Fallback: shop flat fee
    const flat = Number(settings.flat_shipping_fee) || 0;
    const freeMin = Number(settings.free_shipping_min) || 0;
    return {
        amount: calcShipping(subtotalAfterCoupon, flat, freeMin),
        zoneName: null,
        rateId: null,
        freeMin,
        flatFee: flat,
        source: 'shop_settings',
        currency: settings.currency || 'NPR',
    };
}
