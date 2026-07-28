/**
 * Generate a credit note when a return is approved (idempotent per return).
 */
import pool from '../config/connectDB.js';
import { pickId } from './sql.js';
import { findReturnById } from '../models/return.model.js';
import { findOrderById } from '../models/order.model.js';
import { findUserById } from '../models/user.model.js';
import {
    nextDocumentNumber,
    insertCreditNote,
    findLatestIssuedInvoiceForOrder,
    findCreditNoteByReturnId,
} from '../models/sales.model.js';
import { renderCreditNoteHtml } from './salesDocumentRender.js';

export async function ensureCreditNoteForApprovedReturn(returnId, createdByUserId) {
    const existing = await findCreditNoteByReturnId(pickId(returnId));
    if (existing) return existing;

    const ret = await findReturnById(returnId);
    if (!ret) return null;
    const order = await findOrderById(ret.order_row_id);
    if (!order) return null;

    const user = await findUserById(order.userId);
    const inv = await findLatestIssuedInvoiceForOrder(order.orderId);
    const amount = Number(order.lineTotal || order.totalAmt || 0);
    const customer = user ? { name: user.name, email: user.email } : { name: '', email: '' };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const creditNumber = await nextDocumentNumber(client, 'CRN');
        const html = renderCreditNoteHtml({
            creditNumber,
            orderId: order.orderId,
            invoiceNumber: inv?.invoice_number,
            customer,
            amount,
            currency: inv?.currency || 'INR',
            reason: ret.reason || 'Sales return approved',
        });
        const row = await insertCreditNote(client, {
            credit_number: creditNumber,
            sales_invoice_id: inv?.id || null,
            order_return_id: pickId(returnId),
            order_id: order.orderId,
            user_id: order.userId,
            amount,
            currency: inv?.currency || 'INR',
            reason: ret.reason || '',
            html_body: html,
            created_by_user_id: createdByUserId,
        });
        await client.query('COMMIT');
        return row;
    } catch (e) {
        await client.query('ROLLBACK');
        if (String(e.message).includes('duplicate') || e.code === '23505') {
            return findCreditNoteByReturnId(pickId(returnId));
        }
        throw e;
    } finally {
        client.release();
    }
}
