/**
 * Nepal procurement (Admin): suppliers, purchase bills @ 13% VAT, payment-out, purchase returns.
 */
import pool from '../../shared/config/connectDB.js';
import { pickId } from '../../shared/utils/sql.js';
import { getShopSettingsMap } from '../../shared/models/settings.model.js';
import { nextDocumentNumber } from '../../shared/models/sales.model.js';
import { findProductById } from '../../shared/models/product.model.js';
import { getDefaultWarehouseId } from '../../shared/models/inventory.model.js';
import { addStockInTransaction, removeStockInTransaction } from '../../shared/utils/inventoryStock.js';
import { NEPAL_VAT_STANDARD_RATE, purchaseLineAmounts, sumPurchaseLines } from '../../shared/utils/nepalVat.js';
import { renderPurchaseBillHtml, renderPurchaseReturnHtml } from '../../shared/utils/purchaseDocumentRender.js';
import {
    listSuppliers,
    findSupplierById,
    insertSupplier,
    updateSupplier,
    findPurchaseBillById,
    findPurchaseBillLines,
    listPurchaseBills,
    deletePurchaseBillLines,
    insertPurchaseBillLine,
    insertPurchaseBill,
    updatePurchaseBill,
    listPaymentsForBill,
    insertPurchasePayment,
    recomputePurchaseBillPaymentStatus,
    insertPurchaseReturn,
    insertPurchaseReturnLine,
    findPurchaseReturnById,
    findPurchaseReturnLines,
    listPurchaseReturnsForBill,
    updatePurchaseReturn,
    sumPendingReturnQtyForBillLine,
    findPurchaseBillLineById,
    sumPaymentsForBill,
} from '../../shared/models/purchase.model.js';

function prorateReturnLine(billLine, qtyReturned) {
    const origQ = Math.max(1, Number(billLine.quantity));
    const q = Math.min(Math.max(1, Math.floor(Number(qtyReturned))), origQ);
    const ratio = q / origQ;
    const lineNet = Number((Number(billLine.line_net_excl_vat) * ratio).toFixed(2));
    const vatAmt = Number((Number(billLine.vat_amt) * ratio).toFixed(2));
    const gross = Number((lineNet + vatAmt).toFixed(2));
    return { quantity: q, line_net_excl_vat: lineNet, vat_amt: vatAmt, line_gross_incl_vat: gross };
}

async function companyDisplayFromSettings() {
    const s = await getShopSettingsMap();
    return {
        companyName: s.company_legal_name || s.company_name || '',
        companyVatPan: s.company_vat_pan || '',
        currency: s.purchase_default_currency || 'NPR',
    };
}

async function buildBillHtmlPayload(bill, lines) {
    const snap = bill.supplier_snapshot && typeof bill.supplier_snapshot === 'object' ? bill.supplier_snapshot : {};
    const c = await companyDisplayFromSettings();
    const html = renderPurchaseBillHtml({
        billNumber: bill.bill_number,
        billDate: bill.bill_date,
        dueDate: bill.due_date,
        status: bill.status,
        currency: bill.currency || c.currency,
        companyName: c.companyName,
        companyVatPan: bill.company_vat_pan || c.companyVatPan,
        supplierName: snap.name || bill.supplier_name || '',
        supplierVatPan: snap.vat_pan || '',
        supplierAddress: snap.address || '',
        lines,
        subtotalExclVat: bill.subtotal_excl_vat,
        vatAmt: bill.vat_amt,
        totalInclVat: bill.total_incl_vat,
        notes: bill.notes,
        nepaliVatRate: NEPAL_VAT_STANDARD_RATE,
    });
    return html;
}

function mapLinesForHtml(lines) {
    return lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_excl_vat: l.unit_price_excl_vat,
        line_net_excl_vat: l.line_net_excl_vat,
        vat_rate: l.vat_rate,
        vat_amt: l.vat_amt,
        line_gross_incl_vat: l.line_gross_incl_vat,
    }));
}

async function persistDraftBillLines(client, billId, bodyLines) {
    const built = [];
    let lineNo = 1;
    for (const ln of bodyLines) {
        const pid = ln.productId != null ? pickId(ln.productId) : null;
        const desc =
            ln.description ||
            (pid ? (await findProductById(pid))?.name : '') ||
            'Line item';
        const amounts = purchaseLineAmounts({
            quantity: ln.quantity,
            unitPriceExclVat: ln.unitPriceExclVat ?? ln.unit_price_excl_vat,
            vatRate: ln.vatRate ?? ln.vat_rate ?? NEPAL_VAT_STANDARD_RATE,
        });
        built.push({
            product_id: pid,
            description: String(desc).slice(0, 500),
            ...amounts,
        });
        await insertPurchaseBillLine(client, billId, lineNo++, {
            product_id: pid,
            description: String(desc).slice(0, 500),
            quantity: amounts.quantity,
            unit_price_excl_vat: amounts.unit_price_excl_vat,
            line_net_excl_vat: amounts.line_net_excl_vat,
            vat_rate: amounts.vat_rate,
            vat_amt: amounts.vat_amt,
            line_gross_incl_vat: amounts.line_gross_incl_vat,
        });
    }
    const totals = sumPurchaseLines(built);
    return { built, totals };
}

// POST /api/purchases/suppliers - creates a supplier profile for procurement flows.
export async function createSupplierController(req, res) {
    try {
        const b = req.body;
        const row = await insertSupplier(pool, {
            name: b.name,
            vat_pan: b.vatPan ?? '',
            address: b.address ?? '',
            phone: b.phone ?? '',
            email: b.email ?? '',
            notes: b.notes ?? '',
        });
        return res.status(201).json({ data: row, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/purchases/suppliers - lists suppliers with optional search and paging.
export async function listSuppliersController(req, res) {
    try {
        const data = await listSuppliers({
            search: req.query.search,
            limit: Number(req.query.limit) || 100,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/purchases/suppliers/:id - fetches a single supplier record.
export async function getSupplierController(req, res) {
    try {
        const row = await findSupplierById(req.params.id);
        if (!row) return res.status(404).json({ message: 'Not found', error: true, success: false });
        return res.json({ data: row, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/purchases/suppliers/:id - updates editable supplier details.
export async function updateSupplierController(req, res) {
    try {
        const b = req.body;
        const fields = {};
        if (b.name !== undefined) fields.name = b.name;
        if (b.vatPan !== undefined) fields.vat_pan = b.vatPan;
        if (b.address !== undefined) fields.address = b.address;
        if (b.phone !== undefined) fields.phone = b.phone;
        if (b.email !== undefined) fields.email = b.email;
        if (b.notes !== undefined) fields.notes = b.notes;
        const row = await updateSupplier(pool, req.params.id, fields);
        return res.json({ data: row, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/purchases/bills - creates a draft purchase bill shell with generated number.
export async function createPurchaseBillController(req, res) {
    const client = await pool.connect();
    try {
        const supplierId = pickId(req.body.supplierId);
        if (!supplierId) {
            return res.status(400).json({ message: 'supplierId required', error: true, success: false });
        }
        const sup = await findSupplierById(supplierId);
        if (!sup) return res.status(404).json({ message: 'Supplier not found', error: true, success: false });
        const c = await companyDisplayFromSettings();
        await client.query('BEGIN');
        const billNumber = await nextDocumentNumber(client, 'PB');
        const bill = await insertPurchaseBill(client, {
            bill_number: billNumber,
            supplier_id: supplierId,
            status: 'draft',
            bill_date: req.body.billDate || new Date().toISOString().slice(0, 10),
            due_date: req.body.dueDate || null,
            currency: req.body.currency || c.currency,
            company_vat_pan: req.body.companyVatPan ?? c.companyVatPan,
            supplier_snapshot: {},
            subtotal_excl_vat: 0,
            vat_amt: 0,
            total_incl_vat: 0,
            warehouse_id: req.body.warehouseId ? pickId(req.body.warehouseId) : null,
            html_body: '',
            notes: req.body.notes || '',
            created_by_user_id: req.userId,
        });
        await client.query('COMMIT');
        return res.status(201).json({ data: bill, error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// PATCH /api/purchases/bills/:id - updates draft bill fields, lines, totals, and HTML snapshot.
export async function patchPurchaseBillController(req, res) {
    const client = await pool.connect();
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (bill.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft bills can be edited', error: true, success: false });
        }
        const { lines, billDate, dueDate, notes, warehouseId, companyVatPan, currency } = req.body;
        const c = await companyDisplayFromSettings();
        await client.query('BEGIN');
        // Rebuild persisted lines and totals when the patch includes a full lines array.
        if (Array.isArray(lines)) {
            if (!lines.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'lines[] must not be empty', error: true, success: false });
            }
            await deletePurchaseBillLines(client, bill.id);
            const { totals, built } = await persistDraftBillLines(client, bill.id, lines);
            const html = await buildBillHtmlPayload(
                {
                    ...bill,
                    bill_date: billDate ?? bill.bill_date,
                    due_date: dueDate ?? bill.due_date,
                    currency: currency || bill.currency || c.currency,
                    company_vat_pan: companyVatPan ?? bill.company_vat_pan,
                    subtotal_excl_vat: totals.subtotal_excl_vat,
                    vat_amt: totals.vat_amt,
                    total_incl_vat: totals.total_incl_vat,
                    notes: notes ?? bill.notes,
                    status: 'draft',
                },
                mapLinesForHtml(built),
            );
            await updatePurchaseBill(client, bill.id, {
                bill_date: billDate ?? bill.bill_date,
                due_date: dueDate ?? bill.due_date,
                currency: currency || bill.currency || c.currency,
                company_vat_pan: companyVatPan ?? bill.company_vat_pan,
                warehouse_id: warehouseId != null ? pickId(warehouseId) : bill.warehouse_id,
                subtotal_excl_vat: totals.subtotal_excl_vat,
                vat_amt: totals.vat_amt,
                total_incl_vat: totals.total_incl_vat,
                notes: notes ?? bill.notes,
                html_body: html,
            });
        } else {
            const curLines = await findPurchaseBillLines(bill.id);
            const html = await buildBillHtmlPayload(
                {
                    ...bill,
                    bill_date: billDate ?? bill.bill_date,
                    due_date: dueDate ?? bill.due_date,
                    currency: currency || bill.currency,
                    company_vat_pan: companyVatPan ?? bill.company_vat_pan,
                    notes: notes ?? bill.notes,
                },
                mapLinesForHtml(curLines),
            );
            await updatePurchaseBill(client, bill.id, {
                bill_date: billDate ?? bill.bill_date,
                due_date: dueDate ?? bill.due_date,
                currency: currency || bill.currency,
                company_vat_pan: companyVatPan ?? bill.company_vat_pan,
                warehouse_id: warehouseId != null ? pickId(warehouseId) : bill.warehouse_id,
                notes: notes ?? bill.notes,
                html_body: html,
            });
        }
        await client.query('COMMIT');
        const fresh = await findPurchaseBillById(bill.id);
        const outLines = await findPurchaseBillLines(bill.id);
        return res.json({ data: { ...fresh, lines: outLines }, error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// GET /api/purchases/bills/:id - returns bill details with lines, payments, returns, and supplier.
export async function getPurchaseBillController(req, res) {
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const lines = await findPurchaseBillLines(bill.id);
        const payments = await listPaymentsForBill(bill.id);
        const returns = await listPurchaseReturnsForBill(bill.id);
        const sup = await findSupplierById(bill.supplier_id);
        return res.json({ data: { ...bill, lines, payments, returns, supplier: sup }, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/purchases/bills/:id/preview - generates current bill HTML plus payment summary.
export async function previewPurchaseBillController(req, res) {
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const lines = await findPurchaseBillLines(bill.id);
        const html = await buildBillHtmlPayload(bill, mapLinesForHtml(lines));
        const paid = await listPaymentsForBill(bill.id);
        const paidSum = paid.reduce((s, p) => s + Number(p.amount || 0), 0);
        return res.json({
            data: {
                bill,
                lines,
                html,
                vatStandardRatePercent: NEPAL_VAT_STANDARD_RATE,
                paidSum,
                balanceDue: Number((Number(bill.total_incl_vat) - paidSum).toFixed(2)),
            },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/purchases/bills - lists purchase bills by status/supplier with pagination.
export async function listPurchaseBillsController(req, res) {
    try {
        const data = await listPurchaseBills({
            status: req.query.status,
            supplierId: req.query.supplierId,
            limit: Number(req.query.limit) || 50,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/purchases/bills/:id/receive - receives a draft bill and books inventory into stock.
export async function receivePurchaseBillController(req, res) {
    const client = await pool.connect();
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (bill.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft bills can be received', error: true, success: false });
        }
        const lines = await findPurchaseBillLines(bill.id);
        if (!lines.length) {
            return res.status(400).json({ message: 'Add lines before receive', error: true, success: false });
        }
        const sup = await findSupplierById(bill.supplier_id);
        const whId = bill.warehouse_id || (await getDefaultWarehouseId(client));
        if (!whId) {
            return res.status(400).json({ message: 'Set warehouse_id or configure default warehouse', error: true, success: false });
        }
        await client.query('BEGIN');
        const snapshot = {
            name: sup?.name,
            vat_pan: sup?.vat_pan,
            address: sup?.address,
            phone: sup?.phone,
            email: sup?.email,
        };
        // Add stock for each bill line tied to a tracked product.
        for (const ln of lines) {
            if (ln.product_id) {
                await addStockInTransaction(client, {
                    productId: ln.product_id,
                    warehouseId: whId,
                    quantity: ln.quantity,
                    userId: req.userId,
                    note: `Purchase bill ${bill.bill_number}`,
                    reason: 'purchase_receipt',
                });
            }
        }
        const html = await buildBillHtmlPayload(
            { ...bill, status: 'received', supplier_snapshot: snapshot, warehouse_id: whId, supplier_name: sup?.name },
            mapLinesForHtml(lines),
        );
        await updatePurchaseBill(client, bill.id, {
            status: 'received',
            received_at: new Date().toISOString(),
            supplier_snapshot: snapshot,
            warehouse_id: whId,
            html_body: html,
        });
        await client.query('COMMIT');
        return res.json({ data: await findPurchaseBillById(bill.id), error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// POST /api/purchases/bills/:id/void - voids a draft purchase bill.
export async function voidPurchaseBillController(req, res) {
    const client = await pool.connect();
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (bill.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft bills can be voided', error: true, success: false });
        }
        await client.query('BEGIN');
        await updatePurchaseBill(client, bill.id, { status: 'void' });
        await client.query('COMMIT');
        return res.json({ data: await findPurchaseBillById(bill.id), error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// POST /api/purchases/bills/:id/payments - records outgoing payment against a received bill.
export async function createPurchasePaymentController(req, res) {
    const client = await pool.connect();
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (!['received', 'partial_paid', 'paid'].includes(bill.status)) {
            return res.status(400).json({ message: 'Bill must be received before payment', error: true, success: false });
        }
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'amount must be positive', error: true, success: false });
        }
        await client.query('BEGIN');
        const paidBefore = await sumPaymentsForBill(client, bill.id);
        if (paidBefore + amount > Number(bill.total_incl_vat) + 0.01) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Payment exceeds balance due', error: true, success: false });
        }
        await insertPurchasePayment(client, {
            purchase_bill_id: bill.id,
            amount,
            paid_at: req.body.paidAt || new Date().toISOString(),
            method: req.body.method || 'bank',
            reference: req.body.reference || '',
            note: req.body.note || '',
            created_by_user_id: req.userId,
        });
        await recomputePurchaseBillPaymentStatus(client, bill.id);
        await client.query('COMMIT');
        const payList = await listPaymentsForBill(bill.id);
        return res.status(201).json({
            data: {
                payment: payList[0],
                bill: await findPurchaseBillById(bill.id),
            },
            error: false,
            success: true,
        });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// GET /api/purchases/bills/:id/payments - lists all payments made for a bill.
export async function listPurchasePaymentsController(req, res) {
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const data = await listPaymentsForBill(bill.id);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/purchases/bills/:id/returns - creates a draft purchase return with prorated amounts.
export async function createPurchaseReturnController(req, res) {
    const client = await pool.connect();
    try {
        const bill = await findPurchaseBillById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found', error: true, success: false });
        if (!['received', 'partial_paid', 'paid'].includes(bill.status)) {
            return res.status(400).json({ message: 'Bill must be received before a return', error: true, success: false });
        }
        const { lines: retLines, reason } = req.body;
        if (!Array.isArray(retLines) || !retLines.length) {
            return res.status(400).json({ message: 'lines[] required', error: true, success: false });
        }
        await client.query('BEGIN');
        const returnNumber = await nextDocumentNumber(client, 'PRN');
        const returnRow = await insertPurchaseReturn(client, {
            return_number: returnNumber,
            purchase_bill_id: bill.id,
            status: 'draft',
            reason: reason || '',
            subtotal_excl_vat: 0,
            vat_amt: 0,
            total_incl_vat: 0,
            html_body: '',
            created_by_user_id: req.userId,
        });
        const acc = { subtotal_excl_vat: 0, vat_amt: 0, total_incl_vat: 0 };
        const viewLines = [];
        // Validate each requested return line and compute return totals incrementally.
        for (const rl of retLines) {
            const billLineId = pickId(rl.purchaseBillLineId || rl.purchase_bill_line_id);
            const bl = await findPurchaseBillLineById(billLineId);
            if (!bl || Number(bl.purchase_bill_id) !== Number(bill.id)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Invalid purchaseBillLineId', error: true, success: false });
            }
            const already = await sumPendingReturnQtyForBillLine(client, billLineId);
            const maxRet = Number(bl.quantity) - already;
            const pr = prorateReturnLine(bl, rl.quantity);
            if (pr.quantity > maxRet) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: `Return qty exceeds available for line ${billLineId} (max ${maxRet})`,
                    error: true,
                    success: false,
                });
            }
            await insertPurchaseReturnLine(client, returnRow.id, {
                purchase_bill_line_id: billLineId,
                quantity: pr.quantity,
                line_net_excl_vat: pr.line_net_excl_vat,
                vat_amt: pr.vat_amt,
                line_gross_incl_vat: pr.line_gross_incl_vat,
            });
            acc.subtotal_excl_vat += pr.line_net_excl_vat;
            acc.vat_amt += pr.vat_amt;
            acc.total_incl_vat += pr.line_gross_incl_vat;
            viewLines.push({
                description: bl.description,
                quantity: pr.quantity,
                line_net_excl_vat: pr.line_net_excl_vat,
                vat_amt: pr.vat_amt,
                line_gross_incl_vat: pr.line_gross_incl_vat,
            });
        }
        const snap = bill.supplier_snapshot && typeof bill.supplier_snapshot === 'object' ? bill.supplier_snapshot : {};
        const c = await companyDisplayFromSettings();
        const html = renderPurchaseReturnHtml({
            returnNumber: returnRow.return_number,
            billNumber: bill.bill_number,
            status: 'draft',
            currency: bill.currency || c.currency,
            companyName: c.companyName,
            supplierName: snap.name || '',
            lines: viewLines,
            subtotalExclVat: Number(acc.subtotal_excl_vat.toFixed(2)),
            vatAmt: Number(acc.vat_amt.toFixed(2)),
            totalInclVat: Number(acc.total_incl_vat.toFixed(2)),
            reason: reason || '',
        });
        await updatePurchaseReturn(client, returnRow.id, {
            subtotal_excl_vat: Number(acc.subtotal_excl_vat.toFixed(2)),
            vat_amt: Number(acc.vat_amt.toFixed(2)),
            total_incl_vat: Number(acc.total_incl_vat.toFixed(2)),
            html_body: html,
        });
        await client.query('COMMIT');
        const full = await findPurchaseReturnById(returnRow.id);
        const linesOut = await findPurchaseReturnLines(full.id);
        return res.status(201).json({ data: { ...full, lines: linesOut }, error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// GET /api/purchases/returns/:id - returns a purchase return with lines and source bill.
export async function getPurchaseReturnController(req, res) {
    try {
        const row = await findPurchaseReturnById(req.params.id);
        if (!row) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const lines = await findPurchaseReturnLines(row.id);
        const bill = await findPurchaseBillById(row.purchase_bill_id);
        return res.json({ data: { ...row, lines, bill }, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/purchases/returns - lists purchase returns for a specific bill.
export async function listPurchaseReturnsController(req, res) {
    try {
        const billId = req.query.billId;
        if (!billId) {
            return res.status(400).json({ message: 'billId query required', error: true, success: false });
        }
        const data = await listPurchaseReturnsForBill(billId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/purchases/returns/:id/approve - approves return and removes stock from warehouse.
export async function approvePurchaseReturnController(req, res) {
    const client = await pool.connect();
    try {
        const ret = await findPurchaseReturnById(req.params.id);
        if (!ret) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (ret.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft returns can be approved', error: true, success: false });
        }
        const bill = await findPurchaseBillById(ret.purchase_bill_id);
        const lines = await findPurchaseReturnLines(ret.id);
        const whId = bill.warehouse_id || (await getDefaultWarehouseId(client));
        if (!whId) {
            return res.status(400).json({ message: 'No warehouse on bill', error: true, success: false });
        }
        await client.query('BEGIN');
        // Reverse inventory for approved return lines that map to products.
        for (const ln of lines) {
            if (ln.product_id) {
                await removeStockInTransaction(client, {
                    productId: ln.product_id,
                    warehouseId: whId,
                    quantity: ln.quantity,
                    userId: req.userId,
                    note: `Purchase return ${ret.return_number}`,
                    reason: 'purchase_return',
                });
            }
        }
        await updatePurchaseReturn(client, ret.id, {
            status: 'approved',
            approved_at: new Date().toISOString(),
        });
        await client.query('COMMIT');
        return res.json({ data: await findPurchaseReturnById(ret.id), error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}

// POST /api/purchases/returns/:id/void - voids a draft purchase return.
export async function voidPurchaseReturnController(req, res) {
    const client = await pool.connect();
    try {
        const ret = await findPurchaseReturnById(req.params.id);
        if (!ret) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (ret.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft returns can be voided', error: true, success: false });
        }
        await client.query('BEGIN');
        await updatePurchaseReturn(client, ret.id, { status: 'void' });
        await client.query('COMMIT');
        return res.json({ data: await findPurchaseReturnById(ret.id), error: false, success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: e.message, error: true, success: false });
    } finally {
        client.release();
    }
}
