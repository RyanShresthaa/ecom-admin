/**
 * HTML for sales invoices, quotations, and credit notes (print-friendly, minimal inline styles).
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Render quotation HTML document for pre-order sales communication.
export function renderQuotationHtml(q, lines) {
    const rows = lines
        .map(
            (l) =>
                `<tr><td>${esc(l.product_snapshot?.name || l.name || 'Item')}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.line_total}</td></tr>`,
        )
        .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Quotation ${esc(q.quote_number)}</title></head><body>
<h1>Quotation ${esc(q.quote_number)}</h1>
<p>Status: <strong>${esc(q.status)}</strong> · Valid until: ${esc(q.valid_until || '—')}</p>
<p>Currency: ${esc(q.currency)}</p>
<table border="1" cellpadding="6"><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Line</th></tr>${rows}</table>
<p>Subtotal: ${q.subtotal} · Tax: ${q.tax_amt} · Shipping: ${q.shipping_amt}</p>
<h2>Total: ${q.total_amt} ${esc(q.currency)}</h2>
<p>${esc(q.notes)}</p>
</body></html>`;
}

// Render finalized sales invoice HTML with line-level pricing details.
export function renderOrderInvoiceHtml({ invoiceNumber, orderId, customer, address, currency, lines, subtotal, taxAmt, shippingAmt, couponDiscount, couponCode, totalAmt, paymentStatus, issuedAt, revision }) {
    const rows = lines
        .map(
            (l) =>
                `<tr><td>${esc(l.name)}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.lineTotal}</td></tr>`,
        )
        .join('');
    const addr = address
        ? `${esc(address.address_line)}, ${esc(address.city)}, ${esc(address.state)} ${esc(address.pincode)}`
        : '—';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${esc(invoiceNumber)}</title></head><body>
<h1>Tax Invoice ${esc(invoiceNumber)}</h1>
<p><strong>Order:</strong> ${esc(orderId)} · <strong>Revision:</strong> ${revision} · <strong>Issued:</strong> ${esc(issuedAt || 'Draft')}</p>
<p><strong>Bill to:</strong> ${esc(customer?.name)} (${esc(customer?.email)}) ${esc(customer?.mobile || '')}</p>
<p><strong>Ship to:</strong> ${addr}</p>
<p><strong>Payment:</strong> ${esc(paymentStatus || '')}</p>
<table border="1" cellpadding="6"><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Line</th></tr>${rows}</table>
<p>Subtotal: ${subtotal} · Tax: ${taxAmt} · Shipping: ${shippingAmt} · Coupon ${esc(couponCode || '—')}: -${couponDiscount}</p>
<h2>Total: ${totalAmt} ${esc(currency)}</h2>
</body></html>`;
}

// Render credit note HTML for returned or adjusted sales.
export function renderCreditNoteHtml({ creditNumber, orderId, invoiceNumber, customer, amount, currency, reason }) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Credit Note ${esc(creditNumber)}</title></head><body>
<h1>Credit Note ${esc(creditNumber)}</h1>
<p><strong>Order:</strong> ${esc(orderId)} · <strong>Related invoice:</strong> ${esc(invoiceNumber || '—')}</p>
<p><strong>Customer:</strong> ${esc(customer?.name)} (${esc(customer?.email)})</p>
<p><strong>Credit amount:</strong> ${amount} ${esc(currency)}</p>
<p><strong>Reason:</strong> ${esc(reason)}</p>
</body></html>`;
}
