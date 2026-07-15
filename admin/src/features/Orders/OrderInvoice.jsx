import { Printer } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DEFAULT_SETTINGS } from '@/lib/constants'

export function OrderInvoice({ order }) {
  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.name}${item.size ? ` (${item.color}/${item.size})` : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace">${item.sku || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${formatCurrency(item.price)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${formatCurrency(item.price * item.qty)}</td>
        </tr>`
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${order.id}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
            .section { margin-bottom: 24px; }
            .section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #111; font-size: 12px; text-transform: uppercase; }
            .total { text-align: right; font-size: 18px; font-weight: 600; margin-top: 16px; font-family: monospace; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${DEFAULT_SETTINGS.storeName}</h1>
          <p class="meta">Invoice · ${order.id} · ${formatDate(order.date)}</p>

          <div class="section">
            <h2>Bill to</h2>
            <p><strong>${order.customerName}</strong><br>${order.customerEmail}<br>${order.shippingAddress}</p>
          </div>

          <div class="section">
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th style="text-align:center">Qty</th>
                  <th style="text-align:right">Price</th>
                  <th style="text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p class="total">Total: ${formatCurrency(order.totalAmount)}</p>
          </div>

          <div class="section">
            <h2>Payment & delivery</h2>
            <p>Payment: ${order.paymentStatus} · Delivery: ${order.deliveryStatus}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer size={14} />
      Print invoice
    </Button>
  )
}
