/**
 * Nepal VAT: standard rate 13% on taxable value (value excluding VAT).
 * @see https://ird.gov.np/ — line VAT = round(net × rate/100, 2); gross = net + VAT.
 */
// Handle nepalVat utility logic for NEPAL_VAT_STANDARD_RATE.
export const NEPAL_VAT_STANDARD_RATE = 13;
// Handle nepalVat utility logic for NEPAL_PURCHASE_CURRENCY_DEFAULT.
export const NEPAL_PURCHASE_CURRENCY_DEFAULT = 'NPR';

/**
 * @param {{ quantity: number, unitPriceExclVat: number, vatRate?: number }} p
 */
// Compute VAT-exclusive, VAT amount, and VAT-inclusive totals per purchase line.
export function purchaseLineAmounts({ quantity, unitPriceExclVat, vatRate = NEPAL_VAT_STANDARD_RATE }) {
    const q = Math.max(1, Math.floor(Number(quantity) || 0));
    const unit = Number(unitPriceExclVat);
    if (!Number.isFinite(unit) || unit < 0) {
        const err = new Error('unitPriceExclVat must be a non-negative number');
        err.status = 400;
        throw err;
    }
    const rate = Number(vatRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        const err = new Error('vatRate must be between 0 and 100');
        err.status = 400;
        throw err;
    }
    const lineNet = Number((q * unit).toFixed(2));
    const vatAmt = Number((lineNet * (rate / 100)).toFixed(2));
    const gross = Number((lineNet + vatAmt).toFixed(2));
    return {
        quantity: q,
        unit_price_excl_vat: Number(unit.toFixed(4)),
        line_net_excl_vat: lineNet,
        vat_rate: rate,
        vat_amt: vatAmt,
        line_gross_incl_vat: gross,
    };
}

// Aggregate purchase lines into subtotal, VAT, and grand total for Nepal VAT.
export function sumPurchaseLines(lines) {
    return lines.reduce(
        (acc, l) => ({
            subtotal_excl_vat: acc.subtotal_excl_vat + Number(l.line_net_excl_vat || 0),
            vat_amt: acc.vat_amt + Number(l.vat_amt || 0),
            total_incl_vat: acc.total_incl_vat + Number(l.line_gross_incl_vat || 0),
        }),
        { subtotal_excl_vat: 0, vat_amt: 0, total_incl_vat: 0 },
    );
}
