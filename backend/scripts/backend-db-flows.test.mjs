/**
 * Database integration: purchase bill + Nepal VAT + stock receive (rollback, no persistent junk).
 * Skips per-test if DB unreachable or SKIP_DB_TESTS=1.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../shared/config/connectDB.js';
import { purchaseLineAmounts, sumPurchaseLines } from '../shared/utils/nepalVat.js';
import { nextDocumentNumber } from '../shared/models/sales.model.js';
import {
    insertSupplier,
    insertPurchaseBill,
    deletePurchaseBillLines,
    insertPurchaseBillLine,
    updatePurchaseBill,
    insertPurchasePayment,
    sumPaymentsForBill,
    recomputePurchaseBillPaymentStatus,
} from '../shared/models/purchase.model.js';
import { getDefaultWarehouseId } from '../shared/models/inventory.model.js';
import { addStockInTransaction } from '../shared/utils/inventoryStock.js';

describe('Backend DB — procurement + VAT', () => {
    it('creates supplier, draft bill, lines with 13% VAT, then rollbacks', async (t) => {
        if (process.env.SKIP_DB_TESTS === '1') {
            t.skip();
            return;
        }
        let client;
        try {
            client = await pool.connect();
            await client.query('SELECT 1');
        } catch {
            t.skip();
            return;
        }
        try {
            await client.query('BEGIN');
            const sup = await insertSupplier(client, {
                name: `Test Supplier ${Date.now()}`,
                vat_pan: '999999999',
                address: 'Kathmandu',
                phone: '',
                email: '',
                notes: '',
            });
            const billNo = await nextDocumentNumber(client, 'PB');
            const bill = await insertPurchaseBill(client, {
                bill_number: billNo,
                supplier_id: sup.id,
                status: 'draft',
                bill_date: new Date().toISOString().slice(0, 10),
                due_date: null,
                currency: 'NPR',
                company_vat_pan: '',
                supplier_snapshot: {},
                subtotal_excl_vat: 0,
                vat_amt: 0,
                total_incl_vat: 0,
                warehouse_id: null,
                html_body: '',
                notes: '',
                created_by_user_id: null,
            });
            await deletePurchaseBillLines(client, bill.id);
            const a = purchaseLineAmounts({ quantity: 2, unitPriceExclVat: 100, vatRate: 13 });
            await insertPurchaseBillLine(client, bill.id, 1, {
                product_id: null,
                description: 'Test line',
                quantity: a.quantity,
                unit_price_excl_vat: a.unit_price_excl_vat,
                line_net_excl_vat: a.line_net_excl_vat,
                vat_rate: a.vat_rate,
                vat_amt: a.vat_amt,
                line_gross_incl_vat: a.line_gross_incl_vat,
            });
            const totals = sumPurchaseLines([a]);
            await updatePurchaseBill(client, bill.id, {
                subtotal_excl_vat: totals.subtotal_excl_vat,
                vat_amt: totals.vat_amt,
                total_incl_vat: totals.total_incl_vat,
            });
            const r = await client.query(
                `SELECT COUNT(*)::int AS c, SUM(line_gross_incl_vat)::numeric AS g FROM purchase_bill_lines WHERE purchase_bill_id = $1`,
                [bill.id],
            );
            assert.equal(r.rows[0].c, 1);
            assert.equal(Number(r.rows[0].g), 226);
            await client.query('ROLLBACK');
        } catch (e) {
            await client.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            client.release();
        }
    });

    it('receive flow: product + bill line increases warehouse_stock (rollback)', async (t) => {
        if (process.env.SKIP_DB_TESTS === '1') {
            t.skip();
            return;
        }
        let client;
        try {
            client = await pool.connect();
            await client.query('SELECT 1');
        } catch {
            t.skip();
            return;
        }
        try {
            await client.query('BEGIN');
            const pRes = await client.query(
                `INSERT INTO products (name, publish, stock, price) VALUES ($1, true, 0, 0) RETURNING id`,
                [`T-${Date.now()}`],
            );
            const productId = pRes.rows[0].id;
            const sup = await insertSupplier(client, {
                name: `S-${Date.now()}`,
                vat_pan: '123',
                address: '',
                phone: '',
                email: '',
                notes: '',
            });
            const billNo = await nextDocumentNumber(client, 'PB');
            const whId = await getDefaultWarehouseId(client);
            assert.ok(whId, 'default warehouse required');
            const bill = await insertPurchaseBill(client, {
                bill_number: billNo,
                supplier_id: sup.id,
                status: 'draft',
                bill_date: new Date().toISOString().slice(0, 10),
                due_date: null,
                currency: 'NPR',
                company_vat_pan: '',
                supplier_snapshot: {},
                subtotal_excl_vat: 0,
                vat_amt: 0,
                total_incl_vat: 0,
                warehouse_id: whId,
                html_body: '',
                notes: '',
                created_by_user_id: null,
            });
            const a = purchaseLineAmounts({ quantity: 3, unitPriceExclVat: 10, vatRate: 13 });
            await insertPurchaseBillLine(client, bill.id, 1, {
                product_id: productId,
                description: 'Stock line',
                quantity: a.quantity,
                unit_price_excl_vat: a.unit_price_excl_vat,
                line_net_excl_vat: a.line_net_excl_vat,
                vat_rate: a.vat_rate,
                vat_amt: a.vat_amt,
                line_gross_incl_vat: a.line_gross_incl_vat,
            });
            const totals = sumPurchaseLines([a]);
            await updatePurchaseBill(client, bill.id, {
                subtotal_excl_vat: totals.subtotal_excl_vat,
                vat_amt: totals.vat_amt,
                total_incl_vat: totals.total_incl_vat,
            });
            await addStockInTransaction(client, {
                productId,
                warehouseId: whId,
                quantity: 3,
                userId: null,
                note: `Test receive ${billNo}`,
                reason: 'purchase_receipt_test',
            });
            const ws = await client.query(
                `SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
                [whId, productId],
            );
            assert.equal(Number(ws.rows[0]?.quantity || 0), 3);
            await client.query('ROLLBACK');
        } catch (e) {
            await client.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            client.release();
        }
    });

    it('payment-out updates bill status to paid when sum matches total', async (t) => {
        if (process.env.SKIP_DB_TESTS === '1') {
            t.skip();
            return;
        }
        let client;
        try {
            client = await pool.connect();
            await client.query('SELECT 1');
        } catch {
            t.skip();
            return;
        }
        try {
            await client.query('BEGIN');
            const sup = await insertSupplier(client, {
                name: `Pay-${Date.now()}`,
                vat_pan: '1',
                address: '',
                phone: '',
                email: '',
                notes: '',
            });
            const billNo = await nextDocumentNumber(client, 'PB');
            const bill = await insertPurchaseBill(client, {
                bill_number: billNo,
                supplier_id: sup.id,
                status: 'received',
                bill_date: new Date().toISOString().slice(0, 10),
                due_date: null,
                currency: 'NPR',
                company_vat_pan: '',
                supplier_snapshot: { name: 'X' },
                subtotal_excl_vat: 100,
                vat_amt: 13,
                total_incl_vat: 113,
                warehouse_id: null,
                html_body: '',
                notes: '',
                created_by_user_id: null,
            });
            await insertPurchasePayment(client, {
                purchase_bill_id: bill.id,
                amount: 113,
                paid_at: new Date().toISOString(),
                method: 'bank',
                reference: 'TRF-1',
                note: '',
                created_by_user_id: null,
            });
            await recomputePurchaseBillPaymentStatus(client, bill.id);
            const paid = await sumPaymentsForBill(client, bill.id);
            assert.equal(paid, 113);
            const b = await client.query(`SELECT status FROM purchase_bills WHERE id = $1`, [bill.id]);
            assert.equal(b.rows[0].status, 'paid');
            await client.query('ROLLBACK');
        } catch (e) {
            await client.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            client.release();
        }
    });
});
