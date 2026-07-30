/**
 * Build invoice JSON + simple HTML for order confirmation / downloads.
 */
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatAddress(address) {
    if (!address || typeof address !== 'object') return '';
    const street = String(address.address_line || '')
        .replace(/^\[[^\]]+\]\s*/, '')
        .replace(/^.*? — /, '');
    const parts = [
        street,
        [address.city, address.state, address.pincode].filter(Boolean).join(', '),
        address.country,
        address.mobile ? `Tel: ${address.mobile}` : '',
    ].filter(Boolean);
    return parts.map(esc).join('<br/>');
}

export function buildInvoicePayload({ orderId, user, address, summary, paymentStatus, createdAt }) {
    return {
        orderId,
        date: createdAt || new Date().toISOString(),
        customer: { name: user?.name || '', email: user?.email || '', mobile: user?.mobile },
        address,
        paymentStatus,
        currency: summary.currency || 'USD',
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

export function invoiceToHtml(invoice) {
    const lines = invoice.lines
        .map(
            (l) =>
                `<tr>
          <td>${esc(l.name)}</td>
          <td style="text-align:center">${esc(l.quantity)}</td>
          <td style="text-align:right">${esc(l.unitPrice)}</td>
          <td style="text-align:right">${esc(l.lineTotal)}</td>
        </tr>`,
        )
        .join('');
    const addressHtml = formatAddress(invoice.address);
    const dateLabel = invoice.date
        ? new Date(invoice.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : '—';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${esc(invoice.orderId)}</title>
  <style>
    body { font-family: Georgia, serif; color: #2A170F; margin: 32px; background: #fff; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .muted { color: #6b5a4e; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid #eadfd4; text-align: left; }
    th { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b5a4e; }
    .total { font-size: 18px; font-weight: bold; }
    .box { margin-top: 16px; padding: 12px 0; }
  </style>
</head>
<body>
  <h1>Matina Crafts</h1>
  <p class="muted">Invoice ${esc(invoice.orderId)}</p>
  <p class="muted">Date: ${esc(dateLabel)}</p>
  <p class="muted">Payment: ${esc(invoice.paymentStatus || '—')}</p>
  <div class="box">
    <strong>Customer</strong><br/>
    ${esc(invoice.customer?.name || '—')}<br/>
    <span class="muted">${esc(invoice.customer?.email || '')}</span>
  </div>
  ${
    addressHtml
      ? `<div class="box"><strong>Ship to</strong><br/>${addressHtml}</div>`
      : ''
  }
  <table>
    <thead>
      <tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>
  <p class="muted">Subtotal: ${esc(invoice.subtotal)} ${esc(invoice.currency)}</p>
  ${
    Number(invoice.couponDiscount) > 0
      ? `<p class="muted">Discount${invoice.couponCode ? ` (${esc(invoice.couponCode)})` : ''}: -${esc(invoice.couponDiscount)}</p>`
      : ''
  }
  <p class="muted">Tax: ${esc(invoice.taxAmt ?? 0)}</p>
  <p class="muted">Shipping: ${esc(invoice.shippingAmt ?? 0)}</p>
  <p class="total">Total: ${esc(invoice.totalAmt)} ${esc(invoice.currency)}</p>
</body>
</html>`;
}
