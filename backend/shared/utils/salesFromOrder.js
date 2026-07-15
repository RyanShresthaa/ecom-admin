/**
 * Build sales invoice payload + HTML from aggregated order line rows (`findOrdersByOrderGroupId`).
 */
import { renderOrderInvoiceHtml } from './salesDocumentRender.js';

export function aggregateOrderGroupForSalesInvoice(rows, { invoiceNumber, revision = 1, issuedAt = null, customer }) {
    if (!rows?.length) {
        const err = new Error('No order lines for this order id');
        err.status = 404;
        throw err;
    }
    const first = rows[0];
    const lines = rows.map((r) => ({
        name: r.product_details?.name || 'Item',
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
    }));
    const address = first.delivery_address && typeof first.delivery_address === 'object' ? first.delivery_address : null;
    const html = renderOrderInvoiceHtml({
        invoiceNumber,
        orderId: first.orderId,
        customer,
        address,
        currency: 'INR',
        lines,
        subtotal: first.subTotalAmt,
        taxAmt: first.taxAmt,
        shippingAmt: first.shippingAmt,
        couponDiscount: first.couponDiscount,
        couponCode: first.couponCode,
        totalAmt: first.totalAmt,
        paymentStatus: first.payment_status || first.paymentId || '',
        issuedAt: issuedAt || new Date().toISOString(),
        revision,
    });
    return {
        orderId: first.orderId,
        userId: first.userId,
        currency: 'INR',
        subtotal: first.subTotalAmt,
        tax_amt: first.taxAmt,
        shipping_amt: first.shippingAmt,
        coupon_discount: first.couponDiscount,
        coupon_code: first.couponCode,
        total_amt: first.totalAmt,
        html_body: html,
    };
}
