/**
 * Nepal purchase VAT (13%) — pure math, no DB / no server.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NEPAL_VAT_STANDARD_RATE, purchaseLineAmounts, sumPurchaseLines } from '../shared/utils/nepalVat.js';

describe('Nepal VAT purchase math', () => {
    it('defaults to 13% VAT on taxable value excluding VAT', () => {
        assert.equal(NEPAL_VAT_STANDARD_RATE, 13);
        const a = purchaseLineAmounts({ quantity: 2, unitPriceExclVat: 100 });
        assert.equal(a.line_net_excl_vat, 200);
        assert.equal(a.vat_rate, 13);
        assert.equal(a.vat_amt, 26);
        assert.equal(a.line_gross_incl_vat, 226);
    });

    it('supports 0% VAT line (exempt)', () => {
        const a = purchaseLineAmounts({ quantity: 1, unitPriceExclVat: 500, vatRate: 0 });
        assert.equal(a.vat_amt, 0);
        assert.equal(a.line_gross_incl_vat, 500);
    });

    it('sumPurchaseLines aggregates multiple lines', () => {
        const l1 = purchaseLineAmounts({ quantity: 1, unitPriceExclVat: 1000, vatRate: 13 });
        const l2 = purchaseLineAmounts({ quantity: 2, unitPriceExclVat: 50, vatRate: 13 });
        const t = sumPurchaseLines([l1, l2]);
        assert.equal(t.subtotal_excl_vat, 1100);
        assert.equal(t.vat_amt, 143);
        assert.equal(t.total_incl_vat, 1243);
    });
});
