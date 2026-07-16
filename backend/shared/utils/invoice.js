/**
 * Build invoice JSON + simple HTML for order confirmation / downloads.
 */
// Build normalized invoice payload from order, user, and payment context.
export function buildInvoicePayload({ orderId, user, address, summary, paymentStatus, createdAt }) {
    return {
        orderId,
        date: createdAt || new Date().toISOString(),
        customer: { name: user.name, email: user.email, mobile: user.mobile },
        address,
        paymentStatus,
        currency: summary.currency || 'INR',
        lines: summary.lines.map((l) => ({
            name: l.product.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
        })),
        subtotal: summary.subtotal,
        couponDiscount: summary.couponDiscount,
        couponCode: summary.couponCode,
        taxAmt: summary.taxAmt,
        shippingAmt: summary.shippingAmt,
        totalAmt: summary.totalAmt,
    };
}

// Render invoice payload into customer-facing invoice HTML.
export function invoiceToHtml(invoice) {
    const lines = invoice.lines
        .map(
            (l) =>
                `<tr><td>${l.name}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.lineTotal}</td></tr>`,
        )
        .join('');
    return `<!DOCTYPE html><html><body>
    <h1>Invoice ${invoice.orderId}</h1>
    <p>Date: ${invoice.date}</p>
    <p>Customer: ${invoice.customer.name} (${invoice.customer.email})</p>
    <table border="1" cellpadding="6">${lines}</table>
    <p>Total: ${invoice.totalAmt} ${invoice.currency}</p>
    </body></html>`;
}
