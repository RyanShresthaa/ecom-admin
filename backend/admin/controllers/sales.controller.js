/**
 * Sales: quotations, formal invoices (draft → issue → revise), credit notes; staff + scoped customer access.
 */
import pool from '../../shared/config/connectDB.js';
import { pickId } from '../../shared/utils/sql.js';
import { findProductOwner, findProductById } from '../../shared/models/product.model.js';
import { findOrdersByOrderGroupId } from '../../shared/models/order.model.js';
import { findUserById } from '../../shared/models/user.model.js';
import {
    nextDocumentNumber,
    insertQuotation,
    insertQuotationLine,
    deleteQuotationLines,
    findQuotationById,
    findQuotationLines,
    listQuotations,
    updateQuotationFields,
    insertSalesInvoice,
    findSalesInvoiceById,
    findDraftInvoiceForOrder,
    findLatestIssuedInvoiceForOrder,
    maxInvoiceRevision,
    listSalesInvoices,
    updateSalesInvoice,
    listCreditNotes,
    findCreditNoteById,
} from '../../shared/models/sales.model.js';
import { renderQuotationHtml } from '../../shared/utils/salesDocumentRender.js';
import { aggregateOrderGroupForSalesInvoice } from '../../shared/utils/salesFromOrder.js';

function recalcQuotationTotals(lines, taxAmt, shippingAmt) {
    const subtotal = lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
    const total = Number((subtotal + Number(taxAmt || 0) + Number(shippingAmt || 0)).toFixed(2));
    return { subtotal, total_amt: total };
}

function assertStaffOrAdmin(role) {
    if (!['Admin', 'Seller'].includes(role)) {
        const err = new Error('Staff only');
        err.status = 403;
        throw err;
    }
}

async function assertOrderGroupStaffAccess(req, rows) {
    if (req.user.role === 'Admin') return;
    if (req.user.role !== 'Seller') {
        const err = new Error('Permission denied');
        err.status = 403;
        throw err;
    }
    for (const r of rows) {
        const pid = pickId(r.productId);
        const po = await findProductOwner(pid);
        if (!po || Number(po.seller_id) !== Number(req.userId)) {
            const err = new Error('You can only issue invoices for orders containing your products');
            err.status = 403;
            throw err;
        }
    }
}

async function assertInvoiceView(req, inv) {
    if (req.user.role === 'Admin') return;
    if (inv.user_id === req.userId) return;
    if (req.user.role === 'Seller') {
        const rows = await findOrdersByOrderGroupId(inv.order_id);
        await assertOrderGroupStaffAccess(req, rows);
        return;
    }
    const err = new Error('Permission denied');
    err.status = 403;
    throw err;
}

async function assertQuotationView(req, q) {
    if (req.user.role === 'Admin') return;
    if (q.created_by_user_id === req.userId) return;
    if (q.customer_user_id && q.customer_user_id === req.userId) return;
    const err = new Error('Permission denied');
    err.status = 403;
    throw err;
}

/* ---- Quotations ---- */

export async function createQuotationController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const { customerUserId, validUntil, notes, currency, lines, taxAmt, shippingAmt } = req.body;
        if (!Array.isArray(lines) || !lines.length) {
            return res.status(400).json({ message: 'lines[] required', error: true, success: false });
        }
        const built = [];
        for (const ln of lines) {
            const pid = pickId(ln.productId);
            const qty = Math.max(1, Math.floor(Number(ln.quantity || 1)));
            const unit = Number(ln.unitPrice ?? ln.unit_price);
            if (!pid || !Number.isFinite(unit)) {
                return res.status(400).json({ message: 'Each line needs productId and unitPrice', error: true, success: false });
            }
            const p = await findProductById(pid);
            const lineTotal = Number((qty * unit).toFixed(2));
            built.push({
                product_id: pid,
                quantity: qty,
                unit_price: unit,
                line_total: lineTotal,
                product_snapshot: { name: p?.name || 'Product', id: pid },
            });
        }
        const { subtotal, total_amt } = recalcQuotationTotals(built, taxAmt, shippingAmt);
        const qRow = {
            customer_user_id: customerUserId != null ? pickId(customerUserId) : null,
            created_by_user_id: req.userId,
            status: 'draft',
            currency: currency || 'INR',
            valid_until: validUntil || null,
            subtotal,
            tax_amt: Number(taxAmt || 0),
            shipping_amt: Number(shippingAmt || 0),
            total_amt,
            notes: notes || '',
            html_preview: '',
        };

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const quoteNumber = await nextDocumentNumber(client, 'QUO');
            qRow.quote_number = quoteNumber;
            qRow.html_preview = renderQuotationHtml(
                { ...qRow, quote_number: quoteNumber, status: 'draft' },
                built.map((b) => ({
                    product_snapshot: b.product_snapshot,
                    quantity: b.quantity,
                    unit_price: b.unit_price,
                    line_total: b.line_total,
                })),
            );
            const q = await insertQuotation(client, qRow);
            for (const b of built) {
                await insertQuotationLine(client, q.id, b);
            }
            await client.query('COMMIT');
            const linesOut = await findQuotationLines(q.id);
            return res.status(201).json({ data: { ...q, lines: linesOut }, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function listQuotationsController(req, res) {
    try {
        const data = await listQuotations({
            role: req.user.role,
            userId: req.userId,
            limit: Number(req.query.limit) || 50,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getQuotationDetailController(req, res) {
    try {
        const q = await findQuotationById(req.params.id);
        if (!q) return res.status(404).json({ message: 'Not found', error: true, success: false });
        await assertQuotationView(req, q);
        const lines = await findQuotationLines(q.id);
        return res.json({ data: { ...q, lines }, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateQuotationDraftController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const q = await findQuotationById(req.params.id);
        if (!q) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (q.created_by_user_id !== req.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only creator or admin can edit', error: true, success: false });
        }
        if (q.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft quotations can be edited', error: true, success: false });
        }
        const { validUntil, notes, currency, lines, taxAmt, shippingAmt } = req.body;
        const tax = Number(taxAmt !== undefined ? taxAmt : q.tax_amt);
        const ship = Number(shippingAmt !== undefined ? shippingAmt : q.shipping_amt);
        const curr = currency || q.currency;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (Array.isArray(lines) && lines.length) {
                await deleteQuotationLines(client, q.id);
                const built = [];
                for (const ln of lines) {
                    const pid = pickId(ln.productId);
                    const qty = Math.max(1, Math.floor(Number(ln.quantity || 1)));
                    const unit = Number(ln.unitPrice ?? ln.unit_price);
                    if (!pid || !Number.isFinite(unit)) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ message: 'Each line needs productId and unitPrice', error: true, success: false });
                    }
                    const p = await findProductById(pid);
                    const lineTotal = Number((qty * unit).toFixed(2));
                    const row = {
                        product_id: pid,
                        quantity: qty,
                        unit_price: unit,
                        line_total: lineTotal,
                        product_snapshot: { name: p?.name || 'Product', id: pid },
                    };
                    built.push(row);
                    await insertQuotationLine(client, q.id, row);
                }
                const { subtotal, total_amt } = recalcQuotationTotals(built, tax, ship);
                const lineViews = built.map((b) => ({
                    product_snapshot: b.product_snapshot,
                    quantity: b.quantity,
                    unit_price: b.unit_price,
                    line_total: b.line_total,
                }));
                const html = renderQuotationHtml(
                    {
                        ...q,
                        quote_number: q.quote_number,
                        currency: curr,
                        valid_until: validUntil ?? q.valid_until,
                        notes: notes ?? q.notes,
                        status: 'draft',
                        subtotal,
                        tax_amt: tax,
                        shipping_amt: ship,
                        total_amt,
                    },
                    lineViews,
                );
                await updateQuotationFields(client, q.id, {
                    valid_until: validUntil ?? q.valid_until,
                    notes: notes ?? q.notes,
                    html_preview: html,
                    currency: curr,
                    subtotal,
                    tax_amt: tax,
                    shipping_amt: ship,
                    total_amt,
                });
            } else {
                const existingLines = await findQuotationLines(q.id);
                const { subtotal, total_amt } = recalcQuotationTotals(
                    existingLines.map((l) => ({ line_total: l.line_total })),
                    tax,
                    ship,
                );
                const lineViews = existingLines.map((l) => ({
                    product_snapshot: l.product_snapshot,
                    quantity: l.quantity,
                    unit_price: l.unit_price,
                    line_total: l.line_total,
                }));
                const html = renderQuotationHtml(
                    {
                        ...q,
                        quote_number: q.quote_number,
                        currency: curr,
                        valid_until: validUntil ?? q.valid_until,
                        notes: notes ?? q.notes,
                        status: 'draft',
                        subtotal,
                        tax_amt: tax,
                        shipping_amt: ship,
                        total_amt,
                    },
                    lineViews,
                );
                await updateQuotationFields(client, q.id, {
                    valid_until: validUntil ?? q.valid_until,
                    notes: notes ?? q.notes,
                    currency: curr,
                    tax_amt: tax,
                    shipping_amt: ship,
                    subtotal,
                    total_amt,
                    html_preview: html,
                });
            }
            await client.query('COMMIT');
            const fresh = await findQuotationById(q.id);
            const linesOut = await findQuotationLines(q.id);
            return res.json({ data: { ...fresh, lines: linesOut }, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateQuotationStatusController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const { status } = req.body;
        const allowed = ['sent', 'accepted', 'declined', 'void', 'expired'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}`, error: true, success: false });
        }
        const q = await findQuotationById(req.params.id);
        if (!q) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (q.created_by_user_id !== req.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Permission denied', error: true, success: false });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await updateQuotationFields(client, q.id, { status });
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        const fresh = await findQuotationById(q.id);
        return res.json({ data: fresh, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function acceptQuotationAsCustomerController(req, res) {
    try {
        const q = await findQuotationById(req.params.id);
        if (!q) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (q.customer_user_id !== req.userId) {
            return res.status(403).json({ message: 'Only the quoted customer can accept', error: true, success: false });
        }
        if (q.status !== 'sent') {
            return res.status(400).json({ message: 'Quotation must be in sent status', error: true, success: false });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await updateQuotationFields(client, q.id, { status: 'accepted' });
            await client.query('COMMIT');
        } finally {
            client.release();
        }
        return res.json({ data: await findQuotationById(q.id), error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

/* ---- Sales invoices ---- */

export async function createInvoiceFromOrderController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const orderIdStr = String(req.params.orderId || '').trim();
        const rows = await findOrdersByOrderGroupId(orderIdStr);
        if (!rows.length) return res.status(404).json({ message: 'Order not found', error: true, success: false });
        await assertOrderGroupStaffAccess(req, rows);

        const draft = await findDraftInvoiceForOrder(orderIdStr);
        if (draft) {
            return res.status(409).json({
                message: 'A draft invoice already exists for this order',
                data: draft,
                error: true,
                success: false,
            });
        }

        const buyer = await findUserById(rows[0].userId);
        const customer = buyer ? { name: buyer.name, email: buyer.email, mobile: buyer.mobile } : { name: '', email: '' };
        const rev = (await maxInvoiceRevision(orderIdStr)) + 1;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const invoiceNumber = await nextDocumentNumber(client, 'INV');
            const agg = aggregateOrderGroupForSalesInvoice(rows, {
                invoiceNumber,
                revision: rev,
                issuedAt: null,
                customer,
            });
            const inv = await insertSalesInvoice(client, {
                invoice_number: invoiceNumber,
                order_id: agg.orderId,
                user_id: agg.userId,
                status: 'draft',
                revision: rev,
                supersedes_id: null,
                currency: agg.currency,
                subtotal: agg.subtotal,
                tax_amt: agg.tax_amt,
                shipping_amt: agg.shipping_amt,
                coupon_discount: agg.coupon_discount,
                coupon_code: agg.coupon_code,
                total_amt: agg.total_amt,
                html_body: agg.html_body,
                issued_at: null,
                created_by_user_id: req.userId,
            });
            await client.query('COMMIT');
            return res.status(201).json({ data: inv, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function listSalesInvoicesController(req, res) {
    try {
        const data = await listSalesInvoices({
            role: req.user.role,
            userId: req.userId,
            limit: Number(req.query.limit) || 50,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getSalesInvoiceController(req, res) {
    try {
        const inv = await findSalesInvoiceById(req.params.id);
        if (!inv) return res.status(404).json({ message: 'Not found', error: true, success: false });
        await assertInvoiceView(req, inv);
        return res.json({ data: inv, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateSalesInvoiceDraftController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const inv = await findSalesInvoiceById(req.params.id);
        if (!inv) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (inv.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft invoices can be edited', error: true, success: false });
        }
        const rows = await findOrdersByOrderGroupId(inv.order_id);
        await assertOrderGroupStaffAccess(req, rows);
        const { html_body, regenerate } = req.body || {};
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let html = html_body;
            if (regenerate) {
                const buyer = await findUserById(inv.user_id);
                const customer = buyer ? { name: buyer.name, email: buyer.email, mobile: buyer.mobile } : { name: '', email: '' };
                const agg = aggregateOrderGroupForSalesInvoice(rows, {
                    invoiceNumber: inv.invoice_number,
                    revision: inv.revision,
                    issuedAt: null,
                    customer,
                });
                html = agg.html_body;
                await updateSalesInvoice(client, inv.id, {
                    html_body: html,
                    subtotal: agg.subtotal,
                    tax_amt: agg.tax_amt,
                    shipping_amt: agg.shipping_amt,
                    coupon_discount: agg.coupon_discount,
                    coupon_code: agg.coupon_code,
                    total_amt: agg.total_amt,
                });
            } else if (html_body != null) {
                await updateSalesInvoice(client, inv.id, { html_body });
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return res.json({ data: await findSalesInvoiceById(inv.id), error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function issueSalesInvoiceController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const inv = await findSalesInvoiceById(req.params.id);
        if (!inv) return res.status(404).json({ message: 'Not found', error: true, success: false });
        if (inv.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft invoices can be issued', error: true, success: false });
        }
        const rows = await findOrdersByOrderGroupId(inv.order_id);
        await assertOrderGroupStaffAccess(req, rows);
        const issuedAt = new Date().toISOString();
        const buyer = await findUserById(inv.user_id);
        const customer = buyer ? { name: buyer.name, email: buyer.email, mobile: buyer.mobile } : { name: '', email: '' };
        const agg = aggregateOrderGroupForSalesInvoice(rows, {
            invoiceNumber: inv.invoice_number,
            revision: inv.revision,
            issuedAt,
            customer,
        });
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE sales_invoices SET status = 'void', updated_at = NOW() WHERE order_id = $1 AND status = 'draft' AND id <> $2`,
                [inv.order_id, inv.id],
            );
            await updateSalesInvoice(client, inv.id, {
                status: 'issued',
                issued_at: issuedAt,
                html_body: agg.html_body,
            });
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return res.json({ data: await findSalesInvoiceById(inv.id), error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function voidSalesInvoiceController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const inv = await findSalesInvoiceById(req.params.id);
        if (!inv) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const rows = await findOrdersByOrderGroupId(inv.order_id);
        await assertOrderGroupStaffAccess(req, rows);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await updateSalesInvoice(client, inv.id, { status: 'void' });
            await client.query('COMMIT');
        } finally {
            client.release();
        }
        return res.json({ data: await findSalesInvoiceById(inv.id), error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

export async function reviseSalesInvoiceController(req, res) {
    try {
        assertStaffOrAdmin(req.user.role);
        const latest = await findLatestIssuedInvoiceForOrder(String(req.params.orderId || '').trim());
        if (!latest) {
            return res.status(404).json({ message: 'No issued invoice for this order', error: true, success: false });
        }
        const rows = await findOrdersByOrderGroupId(latest.order_id);
        await assertOrderGroupStaffAccess(req, rows);
        const draft = await findDraftInvoiceForOrder(latest.order_id);
        if (draft) {
            return res.status(409).json({ message: 'Void or issue the existing draft first', data: draft, error: true, success: false });
        }
        const buyer = await findUserById(latest.user_id);
        const customer = buyer ? { name: buyer.name, email: buyer.email, mobile: buyer.mobile } : { name: '', email: '' };
        const newRev = latest.revision + 1;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const invoiceNumber = await nextDocumentNumber(client, 'INV');
            const agg = aggregateOrderGroupForSalesInvoice(rows, {
                invoiceNumber,
                revision: newRev,
                issuedAt: null,
                customer,
            });
            const inv = await insertSalesInvoice(client, {
                invoice_number: invoiceNumber,
                order_id: latest.order_id,
                user_id: latest.user_id,
                status: 'draft',
                revision: newRev,
                supersedes_id: latest.id,
                currency: agg.currency,
                subtotal: agg.subtotal,
                tax_amt: agg.tax_amt,
                shipping_amt: agg.shipping_amt,
                coupon_discount: agg.coupon_discount,
                coupon_code: agg.coupon_code,
                total_amt: agg.total_amt,
                html_body: agg.html_body,
                issued_at: null,
                created_by_user_id: req.userId,
            });
            await client.query('COMMIT');
            return res.status(201).json({ data: inv, error: false, success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}

/* ---- Credit notes ---- */

export async function listCreditNotesController(req, res) {
    try {
        const data = await listCreditNotes({
            role: req.user.role,
            userId: req.userId,
            limit: Number(req.query.limit) || 50,
            skip: Number(req.query.skip) || 0,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getCreditNoteController(req, res) {
    try {
        const cn = await findCreditNoteById(req.params.id);
        if (!cn) return res.status(404).json({ message: 'Not found', error: true, success: false });
        const inv = cn.sales_invoice_id ? await findSalesInvoiceById(cn.sales_invoice_id) : null;
        if (req.user.role === 'Admin') {
            /* ok */
        } else if (cn.user_id === req.userId) {
            /* ok */
        } else if (req.user.role === 'Seller') {
            const rows = await findOrdersByOrderGroupId(cn.order_id);
            await assertOrderGroupStaffAccess(req, rows);
        } else {
            return res.status(403).json({ message: 'Permission denied', error: true, success: false });
        }
        return res.json({ data: { ...cn, related_invoice: inv }, error: false, success: true });
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message, error: true, success: false });
    }
}
