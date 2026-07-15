/**
 * Procurement: suppliers, Nepal VAT purchase bills, payment-out, purchase returns.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

export async function listSuppliers({ search, limit = 100, skip = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (search) {
        params.push(`%${String(search).slice(0, 200)}%`);
        where += ` AND (name ILIKE $${params.length} OR vat_pan ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    params.push(Math.min(200, limit), skip);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT * FROM suppliers ${where} ORDER BY name LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

export async function findSupplierById(id) {
    const r = await pool.query(`SELECT * FROM suppliers WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

export async function insertSupplier(client, row) {
    const q = client || pool;
    const r = await q.query(
        `INSERT INTO suppliers (name, vat_pan, address, phone, email, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
            String(row.name || '').slice(0, 300),
            String(row.vat_pan || '').slice(0, 50),
            String(row.address || ''),
            String(row.phone || '').slice(0, 40),
            String(row.email || '').slice(0, 320),
            String(row.notes || ''),
        ],
    );
    return mapRow(r.rows[0]);
}

export async function updateSupplier(client, id, fields) {
    const q = client || pool;
    const allowed = ['name', 'vat_pan', 'address', 'phone', 'email', 'notes'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
        if (fields[k] !== undefined) {
            sets.push(`${k} = $${i++}`);
            vals.push(fields[k]);
        }
    }
    if (!sets.length) return findSupplierById(id);
    sets.push('updated_at = NOW()');
    vals.push(pickId(id));
    await q.query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    return findSupplierById(id);
}

export async function findPurchaseBillById(id) {
    const r = await pool.query(`SELECT * FROM purchase_bills WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

export async function findPurchaseBillLines(billId) {
    const r = await pool.query(
        `SELECT * FROM purchase_bill_lines WHERE purchase_bill_id = $1 ORDER BY line_no, id`,
        [pickId(billId)],
    );
    return mapRows(r.rows);
}

export async function listPurchaseBills({ status, supplierId, limit = 50, skip = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (status) {
        params.push(status);
        where += ` AND pb.status = $${params.length}`;
    }
    if (supplierId) {
        params.push(pickId(supplierId));
        where += ` AND pb.supplier_id = $${params.length}`;
    }
    params.push(Math.min(200, limit), skip);
    const lim = params.length - 1;
    const off = params.length;
    const r = await pool.query(
        `SELECT pb.*, s.name AS supplier_name, s.vat_pan AS supplier_vat_pan,
            (SELECT COALESCE(SUM(quantity), 0)::float FROM purchase_bill_lines l WHERE l.purchase_bill_id = pb.id) AS total_qty,
            (SELECT COALESCE(json_agg(json_build_object(
                'product_id', l.product_id,
                'description', l.description,
                'quantity', l.quantity,
                'unit_price_excl_vat', l.unit_price_excl_vat
              ) ORDER BY l.line_no, l.id), '[]'::json)
             FROM purchase_bill_lines l WHERE l.purchase_bill_id = pb.id) AS lines
         FROM purchase_bills pb
         INNER JOIN suppliers s ON s.id = pb.supplier_id
         ${where}
         ORDER BY pb.created_at DESC
         LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return mapRows(r.rows);
}

export async function deletePurchaseBillLines(client, billId) {
    await client.query(`DELETE FROM purchase_bill_lines WHERE purchase_bill_id = $1`, [pickId(billId)]);
}

export async function insertPurchaseBillLine(client, billId, lineNo, line) {
    await client.query(
        `INSERT INTO purchase_bill_lines (
            purchase_bill_id, line_no, product_id, description, quantity,
            unit_price_excl_vat, line_net_excl_vat, vat_rate, vat_amt, line_gross_incl_vat
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
            pickId(billId),
            lineNo,
            line.product_id || null,
            String(line.description || '').slice(0, 500),
            line.quantity,
            line.unit_price_excl_vat,
            line.line_net_excl_vat,
            line.vat_rate,
            line.vat_amt,
            line.line_gross_incl_vat,
        ],
    );
}

export async function insertPurchaseBill(client, row) {
    const r = await client.query(
        `INSERT INTO purchase_bills (
            bill_number, supplier_id, status, bill_date, due_date, currency, company_vat_pan,
            supplier_snapshot, subtotal_excl_vat, vat_amt, total_incl_vat, warehouse_id,
            html_body, notes, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
            row.bill_number,
            pickId(row.supplier_id),
            row.status || 'draft',
            row.bill_date || new Date().toISOString().slice(0, 10),
            row.due_date || null,
            row.currency || 'NPR',
            String(row.company_vat_pan || '').slice(0, 50),
            JSON.stringify(row.supplier_snapshot || {}),
            row.subtotal_excl_vat,
            row.vat_amt,
            row.total_incl_vat,
            row.warehouse_id || null,
            row.html_body || '',
            String(row.notes || ''),
            row.created_by_user_id || null,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function updatePurchaseBill(client, id, fields) {
    const allowed = [
        'status',
        'bill_date',
        'due_date',
        'currency',
        'company_vat_pan',
        'supplier_snapshot',
        'subtotal_excl_vat',
        'vat_amt',
        'total_incl_vat',
        'warehouse_id',
        'received_at',
        'html_body',
        'notes',
    ];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
        if (fields[k] !== undefined) {
            if (k === 'supplier_snapshot') {
                sets.push(`supplier_snapshot = $${i++}::jsonb`);
                vals.push(JSON.stringify(fields[k]));
            } else {
                sets.push(`${k} = $${i++}`);
                vals.push(fields[k]);
            }
        }
    }
    if (!sets.length) return;
    sets.push('updated_at = NOW()');
    vals.push(pickId(id));
    await client.query(`UPDATE purchase_bills SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

export async function sumPaymentsForBill(client, billId) {
    const r = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM purchase_payments WHERE purchase_bill_id = $1`,
        [pickId(billId)],
    );
    return Number(r.rows[0]?.s || 0);
}

export async function listPaymentsForBill(billId) {
    const r = await pool.query(
        `SELECT * FROM purchase_payments WHERE purchase_bill_id = $1 ORDER BY paid_at DESC, id DESC`,
        [pickId(billId)],
    );
    return mapRows(r.rows);
}

export async function insertPurchasePayment(client, row) {
    const r = await client.query(
        `INSERT INTO purchase_payments (purchase_bill_id, amount, paid_at, method, reference, note, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
            pickId(row.purchase_bill_id),
            row.amount,
            row.paid_at || new Date().toISOString(),
            String(row.method || 'bank').slice(0, 40),
            String(row.reference || '').slice(0, 120),
            String(row.note || ''),
            row.created_by_user_id || null,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function recomputePurchaseBillPaymentStatus(client, billId) {
    const bill = await client.query(`SELECT total_incl_vat, status FROM purchase_bills WHERE id = $1 FOR UPDATE`, [
        pickId(billId),
    ]);
    const row = bill.rows[0];
    if (!row || row.status === 'void' || row.status === 'draft') return row?.status;
    const paid = await sumPaymentsForBill(client, billId);
    const total = Number(row.total_incl_vat);
    let next = row.status;
    if (row.status === 'received' || row.status === 'partial_paid' || row.status === 'paid') {
        if (paid <= 0) next = 'received';
        else if (paid + 0.001 >= total) next = 'paid';
        else next = 'partial_paid';
    }
    await client.query(`UPDATE purchase_bills SET status = $1, updated_at = NOW() WHERE id = $2`, [next, pickId(billId)]);
    return next;
}

export async function insertPurchaseReturn(client, row) {
    const r = await client.query(
        `INSERT INTO purchase_returns (
            return_number, purchase_bill_id, status, reason,
            subtotal_excl_vat, vat_amt, total_incl_vat, html_body, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
            row.return_number,
            pickId(row.purchase_bill_id),
            row.status || 'draft',
            String(row.reason || ''),
            row.subtotal_excl_vat,
            row.vat_amt,
            row.total_incl_vat,
            row.html_body || '',
            row.created_by_user_id || null,
        ],
    );
    return mapRow(r.rows[0]);
}

export async function insertPurchaseReturnLine(client, returnId, line) {
    await client.query(
        `INSERT INTO purchase_return_lines (
            purchase_return_id, purchase_bill_line_id, quantity, line_net_excl_vat, vat_amt, line_gross_incl_vat
        ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
            pickId(returnId),
            pickId(line.purchase_bill_line_id),
            line.quantity,
            line.line_net_excl_vat,
            line.vat_amt,
            line.line_gross_incl_vat,
        ],
    );
}

export async function findPurchaseReturnById(id) {
    const r = await pool.query(`SELECT * FROM purchase_returns WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}

export async function findPurchaseReturnLines(returnId) {
    const r = await pool.query(
        `SELECT prl.*, pbl.description AS bill_line_description, pbl.product_id
         FROM purchase_return_lines prl
         INNER JOIN purchase_bill_lines pbl ON pbl.id = prl.purchase_bill_line_id
         WHERE prl.purchase_return_id = $1
         ORDER BY prl.id`,
        [pickId(returnId)],
    );
    return mapRows(r.rows);
}

export async function listPurchaseReturnsForBill(billId) {
    const r = await pool.query(
        `SELECT * FROM purchase_returns WHERE purchase_bill_id = $1 ORDER BY created_at DESC`,
        [pickId(billId)],
    );
    return mapRows(r.rows);
}

export async function updatePurchaseReturn(client, id, fields) {
    const allowed = ['status', 'html_body', 'approved_at', 'subtotal_excl_vat', 'vat_amt', 'total_incl_vat', 'reason'];
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
    await client.query(`UPDATE purchase_returns SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

export async function sumPendingReturnQtyForBillLine(client, billLineId) {
    const r = await client.query(
        `SELECT COALESCE(SUM(prl.quantity), 0)::int AS q
         FROM purchase_return_lines prl
         INNER JOIN purchase_returns pr ON pr.id = prl.purchase_return_id
         WHERE prl.purchase_bill_line_id = $1
           AND pr.status IN ('draft', 'approved')`,
        [pickId(billLineId)],
    );
    return Number(r.rows[0]?.q || 0);
}

export async function sumApprovedReturnQtyForBillLine(client, billLineId) {
    const r = await client.query(
        `SELECT COALESCE(SUM(prl.quantity), 0)::int AS q
         FROM purchase_return_lines prl
         INNER JOIN purchase_returns pr ON pr.id = prl.purchase_return_id
         WHERE prl.purchase_bill_line_id = $1 AND pr.status = 'approved'`,
        [pickId(billLineId)],
    );
    return Number(r.rows[0]?.q || 0);
}

export async function findPurchaseBillLineById(id) {
    const r = await pool.query(`SELECT * FROM purchase_bill_lines WHERE id = $1`, [pickId(id)]);
    return mapRow(r.rows[0]);
}
