/**
 * Store region presets — United States (default) vs Nepal.
 * Admin Settings can switch `region_mode`; related keys apply together.
 */

export const REGION_PRESETS = {
    us: {
        region_mode: 'us',
        currency: 'USD',
        price_base_currency: 'NPR',
        usd_npr_rate: 133,
        tax_percent: 0,
        tax_region: 'United States',
        vat_standard_rate: 0,
        purchase_default_currency: 'USD',
        admin_timezone: 'America/New_York',
        flat_shipping_fee: 5.99,
        free_shipping_min: 75,
        admin_tax_rules: [
            { id: 1, label: 'Sales tax (none / remitted separately)', rate: 0, region: 'United States' },
        ],
    },
    nepal: {
        region_mode: 'nepal',
        currency: 'NPR',
        price_base_currency: 'NPR',
        usd_npr_rate: 133,
        tax_percent: 13,
        tax_region: 'Nepal',
        vat_standard_rate: 13,
        purchase_default_currency: 'NPR',
        admin_timezone: 'Asia/Kathmandu',
        flat_shipping_fee: 100,
        free_shipping_min: 1000,
        admin_tax_rules: [{ id: 1, label: 'VAT 13%', rate: 13, region: 'Nepal' }],
    },
};

export function normalizeRegionMode(value) {
    const raw = String(value || 'us')
        .trim()
        .toLowerCase();
    if (raw === 'nepal' || raw === 'np' || raw === 'npl') return 'nepal';
    return 'us';
}

export function getRegionPreset(mode) {
    return REGION_PRESETS[normalizeRegionMode(mode)] || REGION_PRESETS.us;
}
