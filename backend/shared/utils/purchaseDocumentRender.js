/**
 * Printable HTML for Nepal purchase bills and purchase returns (VAT 13%).
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Render vendor purchase bill document HTML with tax and totals.
export function renderPurchaseBillHtml({
    billNumber,
    billDate,
    dueDate,
    status,
    currency,
    companyName,
    companyVatPan,
    supplierName,
    supplierVatPan,
    supplierAddress,
    lines,
    subtotalExclVat,
    vatAmt,
    totalInclVat,
    notes,
    nepaliVatRate = 13,
}) {
    const rows = (lines || [])
        .map(
            (l, i) =>
                `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${l.unit_price_excl_vat}</td><td>${l.line_net_excl_vat}</td><td>${l.vat_rate}%</td><td>${l.vat_amt}</td><td>${l.line_gross_incl_vat}</td></tr>`,
        )
        .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Purchase Bill ${esc(billNumber)}</title></head><body>
<h1>Purchase Bill (Nepal VAT)</h1>
<p><strong>Bill No.:</strong> ${esc(billNumber)} · <strong>Status:</strong> ${esc(status)} · <strong>Date:</strong> ${esc(billDate)} · <strong>Due:</strong> ${esc(dueDate || '—')}</p>
<p><strong>Standard VAT rate shown:</strong> ${nepaliVatRate}% (taxable value excludes VAT)</p>
<h2>Buyer (your business)</h2>
<p>${esc(companyName || '—')}<br/>VAT / PAN: ${esc(companyVatPan || '—')}</p>
<h2>Supplier</h2>
<p>${esc(supplierName)}<br/>VAT / PAN: ${esc(supplierVatPan || '—')}<br/>${esc(supplierAddress || '')}</p>
<p><strong>Currency:</strong> ${esc(currency)}</p>
<table border="1" cellpadding="6"><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit excl. VAT</th><th>Net excl. VAT</th><th>VAT %</th><th>VAT amt</th><th>Gross incl. VAT</th></tr>${rows}</table>
<p>Subtotal (excl. VAT): ${subtotalExclVat} · VAT (${nepaliVatRate}% standard on taxable lines): ${vatAmt}</p>
<h2>Total payable (incl. VAT): ${totalInclVat} ${esc(currency)}</h2>
<p>${esc(notes || '')}</p>
<p><small>IRD Nepal — maintain tax invoices & purchase registers as required.</small></p>
</body></html>`;
}

// Render purchase return document HTML for supplier-facing records.
export function renderPurchaseReturnHtml({
    returnNumber,
    billNumber,
    status,
    currency,
    companyName,
    supplierName,
    lines,
    subtotalExclVat,
    vatAmt,
    totalInclVat,
    reason,
    nepaliVatRate = 13,
}) {
    const rows = (lines || [])
        .map(
            (l, i) =>
                `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${l.line_net_excl_vat}</td><td>${l.vat_amt}</td><td>${l.line_gross_incl_vat}</td></tr>`,
        )
        .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Purchase Return ${esc(returnNumber)}</title></head><body>
<h1>Purchase Return / Debit (Nepal VAT)</h1>
<p><strong>Return No.:</strong> ${esc(returnNumber)} · <strong>Bill:</strong> ${esc(billNumber)} · <strong>Status:</strong> ${esc(status)}</p>
<p><strong>Buyer:</strong> ${esc(companyName || '—')} · <strong>Supplier:</strong> ${esc(supplierName)}</p>
<p><strong>Currency:</strong> ${esc(currency)} · VAT reference rate: ${nepaliVatRate}%</p>
<table border="1" cellpadding="6"><tr><th>#</th><th>Description</th><th>Qty returned</th><th>Net excl. VAT</th><th>VAT</th><th>Gross</th></tr>${rows}</table>
<p>Subtotal (excl. VAT): ${subtotalExclVat} · VAT: ${vatAmt}</p>
<h2>Total return value (incl. VAT): ${totalInclVat} ${esc(currency)}</h2>
<p><strong>Reason:</strong> ${esc(reason || '')}</p>
</body></html>`;
}
