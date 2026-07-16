// sales model: handles sales table/entity CRUD and query helpers.
/**
 * Sales documents: document numbers, quotations, sales invoices (revisioned), credit notes.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

// sales model: nextDocumentNumber runs model logic/query operations.
export async function nextDocumentNumber(client, docType) {
    const y = new Date().getFullYear();
    const r = await client.query(
        `INSERT INTO doc_counters (doc_type, y, last_n) VALUES ($1, $2, 1)
         ON CONFLICT (doc_type, y) DO UPDATE SET last_n = doc_counters.last_n + 1
         RETURNING last_n`,
        [docType, y],
    );
    const n = r.rows[0].last_n;
    return `${docType}-${y}-${String(n).padStart(5, '0')}`;
}

/* ---------- Quotations ---------- */

// sales model: insertQuotation creates a new record.
export async function insertQuotation(client, row) {
    const r = await client.query(
        `INSERT INTO quotations (
            quote_number, customer_user_id, created_by_user_id, status, currency, valid_until,
            subtotal, tax_amt, shipping_amt, total_amt, notes, html_preview
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
            row.quote_number,
            row.customer_user_id,
            row.created_by_user_id,
            row.status || 'draft',
            row.currency || 'INR',
            row.valid_until || null,
            row.subtotal,
            row.tax_amt,
            row.shipping_amt,
            row.total_amt,
            row.notes || '',
            row.html_preview || '',
        ],
    );
    return mapRow(r.rows[0]);
}

// sales model: insertQuotationLine creates a new record.
export async function insertQuotationLine(client, quotationId, line) {
    await client.query(
        `INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, line_total, product_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [
            quotationId,
            line.product_id,
            line.quantity,
            line.unit_price,
            line.line_total,
            JSON.stringify(line.product_snapshot || {}),
        ],
    );
}

// sales model: deleteQuotationLines deletes matching records.
export async function deleteQuotationLines(client, quotationId) {
    await client.query(`DELETE FROM quotation_lines WHERE quotation_id = $1`, [quotationId]);
}

// sales model: findQuotationById reads and returns records.
export async function findQuotationById(id) {
    const r = await pool.query(`SELECT * FROM quotations WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

// sales model: findQuotationLines reads and returns records.
export async function findQuotationLines(quotationId) {
    const r = await pool.query(`SELECT * FROM quotation_lines WHERE quotation_id = $1 ORDER BY id`, [quotationId]);
    return mapRows(r.rows);
}

// sales model: listQuotations reads and returns records.
export async function listQuotations({ role, userId, limit = 50, skip = 0 }) {
    const params = [];
    let where = 'WHERE 1=1';
    if (role === 'Seller') {
        params.push(userId);
        where += ` AND created_by_user_id = $${params.length}`;
    } else if (role === 'User') {
        params.push(userId);
        where += ` AND customer_user_id = $${params.length}`;
    }
    params.push(Math.min(200, limit), skip);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT * FROM quotations ${where} ORDER BY created_at DESC LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

// sales model: updateQuotationFields updates existing records.
export async function updateQuotationFields(client, id, fields) {
    const allowed = ['status', 'valid_until', 'notes', 'html_preview', 'currency', 'subtotal', 'tax_amt', 'shipping_amt', 'total_amt'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
        if (fields[k] !== undefined) {
            sets.push(`${k} = $${i++}`);
            vals.push(fields[k]);
        }
    }
    if (!sets.length) return findQuotationById(id);
    sets.push('updated_at = NOW()');
    vals.push(pickId(id));
    await client.query(`UPDATE quotations SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

/* ---------- Sales invoices ---------- */

// sales model: insertSalesInvoice creates a new record.
export async function insertSalesInvoice(client, row) {
    const r = await client.query(
        `INSERT INTO sales_invoices (
            invoice_number, order_id, user_id, status, revision, supersedes_id, currency,
            subtotal, tax_amt, shipping_amt, coupon_discount, coupon_code, total_amt, html_body,
            issued_at, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
            row.invoice_number,
            row.order_id,
            row.user_id,
            row.status || 'draft',
            row.revision || 1,
            row.supersedes_id || null,
            row.currency || 'INR',
            row.subtotal,
            row.tax_amt,
            row.shipping_amt,
            row.coupon_discount ?? 0,
            row.coupon_code || null,
            row.total_amt,
            row.html_body || '',
            row.issued_at || null,
            row.created_by_user_id || null,
        ],
    );
    return mapRow(r.rows[0]);
}

// sales model: findSalesInvoiceById reads and returns records.
export async function findSalesInvoiceById(id) {
    const r = await pool.query(`SELECT * FROM sales_invoices WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

// sales model: findLatestIssuedInvoiceForOrder reads and returns records.
export async function findLatestIssuedInvoiceForOrder(orderIdStr) {
    const r = await pool.query(
        `SELECT * FROM sales_invoices WHERE order_id = $1 AND status = 'issued' ORDER BY revision DESC, id DESC LIMIT 1`,
        [orderIdStr],
    );
    return mapRow(r.rows[0]);
}

// sales model: findDraftInvoiceForOrder reads and returns records.
export async function findDraftInvoiceForOrder(orderIdStr) {
    const r = await pool.query(
        `SELECT * FROM sales_invoices WHERE order_id = $1 AND status = 'draft' ORDER BY revision DESC, id DESC LIMIT 1`,
        [orderIdStr],
    );
    return mapRow(r.rows[0]);
}

// sales model: maxInvoiceRevision reads and returns records.
export async function maxInvoiceRevision(orderIdStr, client = null) {
    const q = client || pool;
    const r = await q.query(`SELECT COALESCE(MAX(revision), 0)::int AS m FROM sales_invoices WHERE order_id = $1`, [orderIdStr]);
    return r.rows[0]?.m ?? 0;
}

// sales model: listSalesInvoices reads and returns records.
export async function listSalesInvoices({ role, userId, limit = 50, skip = 0 }) {
    const params = [];
    let where = 'WHERE 1=1';
    if (role === 'Admin') {
        /* all */
    } else if (role === 'Seller') {
        params.push(userId);
        where += ` AND id IN (
            SELECT DISTINCT si.id FROM sales_invoices si
            INNER JOIN orders o ON o.order_id = si.order_id
            INNER JOIN products p ON p.id = o.product_id
            WHERE p.seller_id = $${params.length}
        )`;
    } else {
        params.push(userId);
        where += ` AND user_id = $${params.length}`;
    }
    params.push(Math.min(200, limit), skip);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT * FROM sales_invoices ${where} ORDER BY created_at DESC LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

// sales model: updateSalesInvoice updates existing records.
export async function updateSalesInvoice(client, id, fields) {
    const allowed = ['html_body', 'subtotal', 'tax_amt', 'shipping_amt', 'coupon_discount', 'coupon_code', 'total_amt', 'status', 'issued_at'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
        if (fields[k] !== undefined) {
            sets.push(`${k} = $${i++}`);
            vals.push(fields[k]);
        }
    }
    if (!sets.length) return;
    sets.push('updated_at = NOW()');
    vals.push(pickId(id));
    await client.query(`UPDATE sales_invoices SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

/* ---------- Credit notes ---------- */

// sales model: insertCreditNote creates a new record.
export async function insertCreditNote(client, row) {
    const r = await client.query(
        `INSERT INTO credit_notes (
            credit_number, sales_invoice_id, order_return_id, order_id, user_id, amount, currency, reason, html_body, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
            row.credit_number,
            row.sales_invoice_id || null,
            row.order_return_id || null,
            row.order_id,
            row.user_id,
            row.amount,
            row.currency || 'INR',
            row.reason || '',
            row.html_body || '',
            row.created_by_user_id || null,
        ],
    );
    return mapRow(r.rows[0]);
}

// sales model: findCreditNoteByReturnId reads and returns records.
export async function findCreditNoteByReturnId(returnId) {
    const r = await pool.query(`SELECT * FROM credit_notes WHERE order_return_id = $1`, [pickId(returnId)]);
    return mapRow(r.rows[0]);
}

// sales model: findCreditNoteById reads and returns records.
export async function findCreditNoteById(id) {
    const r = await pool.query(`SELECT * FROM credit_notes WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

// sales model: listCreditNotes reads and returns records.
export async function listCreditNotes({ role, userId, limit = 50, skip = 0 }) {
    const params = [];
    let where = 'WHERE 1=1';
    if (role === 'Admin') {
        /* */
    } else if (role === 'Seller') {
        params.push(userId);
        where += ` AND id IN (
            SELECT cn.id FROM credit_notes cn
            INNER JOIN orders o ON o.order_id = cn.order_id
            INNER JOIN products p ON p.id = o.product_id
            WHERE p.seller_id = $${params.length}
        )`;
    } else {
        params.push(userId);
        where += ` AND user_id = $${params.length}`;
    }
    params.push(Math.min(200, limit), skip);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT * FROM credit_notes ${where} ORDER BY created_at DESC LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

