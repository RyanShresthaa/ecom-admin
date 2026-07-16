/**
 * Credit-note helpers used by refunds and return approvals.
 * Wraps sales document creation so payment services stay free of HTML/render details.
 */
import pool from '../../config/connectDB.js';
import { pickId } from '../../utils/sql.js';
import { findReturnById } from '../../models/return.model.js';
import { findOrderById } from '../../models/order.model.js';
import { findUserById } from '../../models/user.model.js';
import {
    nextDocumentNumber,
    insertCreditNote,
    findLatestIssuedInvoiceForOrder,
    findCreditNoteByReturnId,
} from '../../models/sales.model.js';
import { renderCreditNoteHtml } from '../../utils/salesDocumentRender.js';
import { getShopSettingsMap } from '../../models/settings.model.js';

/**
 * Idempotent credit note when a customer return is approved.
 * (Same behaviour as the former salesCreditFromReturn util.)
 */
export async function ensureCreditNoteForApprovedReturn(returnId, createdByUserId) {
    // Reuse an existing credit note if return was already processed.
    const existing = await findCreditNoteByReturnId(pickId(returnId));
    if (existing) return existing;

    const ret = await findReturnById(returnId);
    if (!ret) return null;
    const order = await findOrderById(ret.order_row_id);
    if (!order) return null;

    return createCreditNoteForOrderLine({
        order,
        amount: Number(order.lineTotal || order.totalAmt || 0),
        reason: ret.reason || 'Sales return approved',
        orderReturnId: pickId(returnId),
        createdByUserId,
    });
}

/**
 * Credit note for a staff refund (full or partial) — no return row required.
 */
export async function createCreditNoteForOrderLine({
    order,
    amount,
    reason,
    orderReturnId = null,
    createdByUserId = null,
}) {
    // Resolve invoice/customer context used in rendered credit-note document.
    const user = await findUserById(order.userId);
    const inv = await findLatestIssuedInvoiceForOrder(order.orderId);
    const settings = await getShopSettingsMap();
    const currency = inv?.currency || settings.currency || 'NPR';
    const customer = user ? { name: user.name, email: user.email } : { name: '', email: '' };
    const noteAmount = Number(amount);

    const client = await pool.connect();
    try {
        // Write credit note atomically to avoid duplicate document numbers.
        await client.query('BEGIN');
        const creditNumber = await nextDocumentNumber(client, 'CRN');
        const html = renderCreditNoteHtml({
            creditNumber,
            orderId: order.orderId,
            invoiceNumber: inv?.invoice_number,
            customer,
            amount: noteAmount,
            currency,
            reason: reason || 'Refund',
        });
        const row = await insertCreditNote(client, {
            credit_number: creditNumber,
            sales_invoice_id: inv?.id || null,
            order_return_id: orderReturnId,
            order_id: order.orderId,
            user_id: order.userId,
            amount: noteAmount,
            currency,
            reason: reason || '',
            html_body: html,
            created_by_user_id: createdByUserId,
        });
        await client.query('COMMIT');
        return row;
    } catch (e) {
        await client.query('ROLLBACK');
        // Return existing record when return-based credit note conflicts on unique key.
        if (orderReturnId && (String(e.message).includes('duplicate') || e.code === '23505')) {
            return findCreditNoteByReturnId(pickId(orderReturnId));
        }
        throw e;
    } finally {
        client.release();
    }
}
