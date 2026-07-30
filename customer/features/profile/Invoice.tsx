'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import {
  ApiError,
  cancelMyOrder,
  fetchMyOrders,
  formatMoney,
  type ApiAddress,
  type ApiOrder,
} from '@/lib/api';
import { downloadHtmlDocument, printHtmlDocument } from '@/lib/printHtml';

export interface InvoiceItem {
  description: string;
  artist: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

type InvoiceView = {
  orderId: string;
  lineId: string;
  invoiceDate: string;
  dueDate: string;
  billName: string;
  billLines: string[];
  shipName: string;
  shipLines: string[];
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentStatusDate: string;
  paymentMethod: string;
  transactionId: string;
  deliveryStatus: string;
  currency: string;
};

function isPastCancelWindow(status?: string): boolean {
  const s = String(status || '').toLowerCase().trim();
  if (!s) return false;
  return /ship|out.?for|transit|deliver|dispatch|return|cancel/i.test(s);
}

function formatLongDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function addDaysLabel(value: string | undefined, days: number): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    d.setDate(d.getDate() + days);
    return formatLongDate(d.toISOString());
  } catch {
    return '—';
  }
}

function addressLines(addr: ApiAddress | Record<string, unknown> | null | undefined): {
  name: string;
  lines: string[];
} {
  if (!addr || typeof addr !== 'object') return { name: '—', lines: [] };
  const a = addr as ApiAddress;
  const raw = String(a.address_line || '');
  const named = raw.match(/^\[([^\]]+)\]\s*(.*?)\s*—\s*(.*)$/);
  const name = named?.[2]?.trim() || '—';
  const street = (named?.[3] || raw).replace(/^\[[^\]]+\]\s*/, '').trim();
  const cityLine = [a.city, a.state, a.pincode].filter(Boolean).join(', ');
  const lines = [street, cityLine, a.country, a.mobile ? `Tel: ${a.mobile}` : '']
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return { name: name === '—' && lines[0] ? lines[0] : name, lines: name === '—' ? lines.slice(1) : lines };
}

function mapOrdersToInvoice(rows: ApiOrder[], queryId: string, fallbackName: string): InvoiceView | null {
  if (!rows.length) return null;

  let group = rows;
  if (queryId) {
    const byLine = rows.filter((o) => String(o.id ?? o._id) === queryId);
    const byGroup = rows.filter((o) => String(o.orderId || '') === queryId);
    group = byLine.length ? rows.filter((o) => String(o.orderId || o.id) === String(byLine[0].orderId || byLine[0].id)) : byGroup;
    if (!group.length && byLine.length) group = byLine;
    if (!group.length) return null;
  } else {
    const firstGroup = String(rows[0].orderId || rows[0].id || '');
    group = rows.filter((o) => String(o.orderId || o.id || '') === firstGroup);
  }

  const first = group[0];
  const orderId = String(first.orderId || first.id || first._id || '');
  const lineId = String(first.id ?? first._id ?? '');
  const bill = addressLines(first.delivery_address);
  const ship = bill;
  const currency = 'USD';

  const items: InvoiceItem[] = group.map((o) => {
    const product =
      (typeof o.productId === 'object' && o.productId) || o.product_details || null;
    const qty = Number(o.quantity ?? 1);
    const unit = Number(o.unitPrice ?? 0);
    const amount = Number(o.lineTotal ?? unit * qty);
    return {
      description: product?.name || 'Order item',
      artist: '',
      qty,
      unitPrice: unit,
      amount,
    };
  });

  const subtotal = Number(first.subTotalAmt ?? items.reduce((s, i) => s + i.amount, 0));
  const shipping = Number(first.shippingAmt ?? 0);
  const tax = Number(first.taxAmt ?? 0);
  const total = Number(first.totalAmt ?? subtotal + shipping + tax);
  const pay = String(first.payment_status || '');
  const deliveryStatus = group.some((g) => isPastCancelWindow(g.delivery_status))
    ? String(group.find((g) => isPastCancelWindow(g.delivery_status))?.delivery_status || '')
    : String(first.delivery_status || '');

  let paymentMethod = '—';
  if (/cash|cod/i.test(pay)) paymentMethod = 'Cash on Delivery';
  else if (/paid|card|stripe|visa|online/i.test(pay)) paymentMethod = 'Online payment';
  else if (pay) paymentMethod = pay;

  return {
    orderId,
    lineId,
    invoiceDate: formatLongDate(first.createdAt),
    dueDate: addDaysLabel(first.createdAt, 22),
    billName: bill.name !== '—' ? bill.name : fallbackName || '—',
    billLines: bill.lines,
    shipName: ship.name !== '—' ? ship.name : fallbackName || '—',
    shipLines: ship.lines,
    items,
    subtotal,
    shipping,
    tax,
    total,
    paymentStatus: /paid/i.test(pay)
      ? 'Paid'
      : /refund/i.test(pay)
        ? 'Refunded'
        : /cancel/i.test(pay)
          ? 'Cancelled'
          : /cash|cod/i.test(pay)
            ? 'Cash on Delivery'
            : pay || 'Pending',
    paymentStatusDate: formatLongDate(first.createdAt),
    paymentMethod,
    transactionId: String(
      (first as { paymentId?: string }).paymentId ||
        (first as { payment_id?: string }).payment_id ||
        orderId ||
        '—',
    ),
    deliveryStatus,
    currency,
  };
}

function money(n: number, currency: string) {
  try {
    return formatMoney(n, currency).replace(/^US/, '');
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

const Invoice: React.FC = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id')?.trim() || '';

  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const canCancel = Boolean(invoice && !isPastCancelWindow(invoice.deliveryStatus));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetchMyOrders();
        if (cancelled) return;
        const view = mapOrdersToInvoice(rows, queryId, user?.name || '');
        if (!view) {
          setInvoice(null);
          setError(
            queryId
              ? 'Order not found. Open My Orders and choose View Invoice.'
              : 'No orders yet. Place an order to generate an invoice.',
          );
        } else {
          setInvoice(view);
        }
      } catch (err) {
        if (cancelled) return;
        setInvoice(null);
        setError(
          err instanceof ApiError && (err.status === 401 || err.status === 403)
            ? 'Sign in is required to view invoices.'
            : err instanceof Error
              ? err.message
              : 'Failed to load invoice',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryId, user?.name]);

  const buildInvoiceHtml = () => {
    if (!invoice) return null;
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const bill = invoice.billLines.map((l) => `<div class="muted">${esc(l)}</div>`).join('');
    const ship = invoice.shipLines.map((l) => `<div class="muted">${esc(l)}</div>`).join('');
    const rows =
      invoice.items.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:24px;color:#6b5a4e">No invoice line items yet.</td></tr>`
        : invoice.items
            .map(
              (item) => `<tr>
                <td>
                  <strong>${esc(item.description)}</strong>
                  ${item.artist ? `<div class="muted">${esc(item.artist)}</div>` : ''}
                </td>
                <td style="text-align:center">${item.qty}</td>
                <td style="text-align:right">${esc(money(item.unitPrice, invoice.currency))}</td>
                <td style="text-align:right"><strong>${esc(money(item.amount, invoice.currency))}</strong></td>
              </tr>`,
            )
            .join('');

    const shipLabel =
      invoice.shipping <= 0 ? 'Free' : money(invoice.shipping, invoice.currency);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${esc(invoice.orderId)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Georgia,'Times New Roman',serif;color:#2A170F;margin:28px;background:#fff;font-size:13px;line-height:1.45}
        h1{font-size:26px;margin:0 0 6px;letter-spacing:.04em}
        .muted{color:#6b5a4e;font-size:12px}
        .row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th,td{padding:10px 8px;border-bottom:1px solid #eadfd4;text-align:left;vertical-align:top}
        th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b5a4e}
        .totals{width:280px;margin-left:auto;margin-top:8px}
        .totals div{display:flex;justify-content:space-between;margin:6px 0;color:#6b5a4e}
        .totals strong{color:#2A170F}
        .due{margin-top:14px;padding:14px 16px;background:#FAF6F2;border:1px solid #eadfd4;border-radius:12px;display:flex;justify-content:space-between;align-items:center}
        .due span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#664132;font-weight:bold}
        .due strong{font-size:22px;color:#8C523A}
        .meta{font-size:12px}
        .meta p{margin:4px 0}
        .pay{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;padding:14px;background:#FAF6F2;border:1px solid #eadfd4;border-radius:12px}
        .notes{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;padding-top:18px;border-top:1px solid #eadfd4;font-size:11px;color:#6b5a4e}
        .notes h3{margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#664132}
        @media print{body{margin:12px}@page{margin:12mm}}
      </style></head><body>
        <div class="row">
          <div>
            <h1>MATINA CRAFTS</h1>
            <div class="muted">Bhaktapur, Nepal<br/>matinacrafts@gmail.com<br/>+977 9823650608</div>
          </div>
          <div class="meta" style="text-align:right">
            <p><span class="muted">Invoice #</span> <strong>${esc(invoice.orderId)}</strong></p>
            <p><span class="muted">Invoice Date:</span> ${esc(invoice.invoiceDate)}</p>
            <p><span class="muted">Due Date:</span> ${esc(invoice.dueDate)}</p>
          </div>
        </div>
        <div class="grid2">
          <div>
            <div class="muted" style="letter-spacing:.15em;text-transform:uppercase;font-size:10px;margin-bottom:6px">Bill To</div>
            <strong>${esc(invoice.billName)}</strong>${bill}
          </div>
          <div>
            <div class="muted" style="letter-spacing:.15em;text-transform:uppercase;font-size:10px;margin-bottom:6px">Ship To</div>
            <strong>${esc(invoice.shipName)}</strong>${ship}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><strong>${esc(money(invoice.subtotal, invoice.currency))}</strong></div>
          <div><span>Shipping</span><strong>${esc(shipLabel)}</strong></div>
          <div><span>Tax (0%)</span><strong>${esc(money(invoice.tax, invoice.currency))}</strong></div>
          <div class="due"><span>Total due</span><strong>${esc(money(invoice.total, invoice.currency))}</strong></div>
        </div>
        <div class="pay">
          <div><div class="muted" style="text-transform:uppercase;font-size:10px;margin-bottom:4px">Payment Status</div><strong>${esc(invoice.paymentStatus)}</strong> <span class="muted">on ${esc(invoice.paymentStatusDate)}</span></div>
          <div><div class="muted" style="text-transform:uppercase;font-size:10px;margin-bottom:4px">Payment Method</div><strong>${esc(invoice.paymentMethod)}</strong></div>
          <div><div class="muted" style="text-transform:uppercase;font-size:10px;margin-bottom:4px">Transaction ID</div><strong>${esc(invoice.transactionId)}</strong></div>
        </div>
        <div class="notes">
          <div>
            <h3>Notes</h3>
            <p>Thank you for supporting Nepalese artisans. Each piece is handmade — slight variations are part of its character.</p>
          </div>
          <div>
            <h3>Terms</h3>
            <p>Returns accepted within 14 days of delivery for unused items in original condition. Contact matinacrafts@gmail.com for support.</p>
          </div>
        </div>
        <p style="text-align:center;margin-top:28px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#6b5a4e">
          Thank you for your business<br/>
          <span style="display:block;margin-top:6px;letter-spacing:normal;text-transform:none;color:#9a8578">© Matina Crafts · matinacrafts.com</span>
        </p>
      </body></html>`;
  };

  /** Prints only the invoice document (isolated iframe) — does not affect other pages. */
  const handlePrint = () => {
    const html = buildInvoiceHtml();
    if (!html) return;
    printHtmlDocument(html);
  };

  const handleDownloadPdf = () => {
    const html = buildInvoiceHtml();
    if (!html || !invoice) return;
    downloadHtmlDocument(html, `invoice-${invoice.orderId}.html`);
  };

  const handleCancel = async () => {
    if (!invoice || !canCancel || cancelling) return;
    const ok = window.confirm(
      `Cancel order #${invoice.orderId}? Paid orders are refunded when possible.`,
    );
    if (!ok) return;
    setCancelling(true);
    setActionMsg('');
    try {
      await cancelMyOrder(invoice.orderId);
      setInvoice({ ...invoice, deliveryStatus: 'cancelled', paymentStatus: 'Cancelled' });
      setActionMsg('Order cancelled.');
    } catch (err) {
      setActionMsg(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not cancel this order.',
      );
    } finally {
      setCancelling(false);
    }
  };

  const shippingLabel = useMemo(() => {
    if (!invoice) return '—';
    if (invoice.shipping <= 0) return '$Free';
    return money(invoice.shipping, invoice.currency);
  }, [invoice]);

  if (!user) return null;

  return (
    <section className="min-h-screen bg-[#FAF6F2] pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 select-none">
      <div className="container-custom max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <ProfileSidebar active="invoice" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            {/* Page header — matches designed layout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1">
                  ORDER DETAILS
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] tracking-tight">
                  Invoice
                </h1>
                <p className="font-secondary text-xs sm:text-sm text-body/80 mt-1">
                  {invoice ? `Order #${invoice.orderId}` : 'Your order receipt'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Icon icon="ph:x-circle-bold" className="w-4 h-4" />
                    <span>{cancelling ? 'Cancelling…' : 'Cancel order'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!invoice || loading}
                  className="px-4 py-2.5 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <Icon icon="lucide:download" className="w-4 h-4 text-muted" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!invoice || loading}
                  className="px-4 py-2.5 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <Icon icon="lucide:printer" className="w-4 h-4 text-muted" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {actionMsg && (
              <p
                className={`text-xs rounded-2xl px-4 py-3 border ${
                  /cancel/i.test(actionMsg) && !/could not/i.test(actionMsg)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {actionMsg}
              </p>
            )}

            <div className="bg-white rounded-3xl border border-primary/10 shadow-xs overflow-hidden">
              {loading && (
                <p className="font-secondary text-sm text-body/70 text-center py-24">
                  Loading invoice…
                </p>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                  <Icon icon="lucide:file-warning" className="w-10 h-10 text-amber-600" />
                  <p className="font-secondary text-sm text-body/80 max-w-md">{error}</p>
                  <Link
                    href="/orders"
                    className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    Go to My Orders
                  </Link>
                </div>
              )}

              {!loading && !error && invoice && (
                <div className="p-6 sm:p-8 lg:p-10 flex flex-col gap-8">
                  {/* 1. Brand + invoice meta */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                    <div>
                      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#2A170F] tracking-wide">
                        MATINA CRAFTS
                      </h2>
                      <p className="text-xs text-muted mt-2 leading-relaxed">
                        Bhaktapur, Nepal
                        <br />
                        matinacrafts@gmail.com
                        <br />
                        +977 9823650608
                      </p>
                    </div>
                    <div className="text-xs sm:text-right space-y-1.5">
                      <p>
                        <span className="text-muted">Invoice #</span>{' '}
                        <span className="font-bold text-[#2A170F]">{invoice.orderId}</span>
                      </p>
                      <p>
                        <span className="text-muted">Invoice Date:</span>{' '}
                        <span className="font-medium text-[#2A170F]">{invoice.invoiceDate}</span>
                      </p>
                      <p>
                        <span className="text-muted">Due Date:</span>{' '}
                        <span className="font-medium text-[#2A170F]">{invoice.dueDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* 2. Bill To / Ship To */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-2">
                        Bill To
                      </p>
                      <p className="font-bold text-[#2A170F]">{invoice.billName}</p>
                      {invoice.billLines.map((line) => (
                        <p key={line} className="text-muted mt-0.5">
                          {line}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-2">
                        Ship To
                      </p>
                      <p className="font-bold text-[#2A170F]">{invoice.shipName}</p>
                      {invoice.shipLines.map((line) => (
                        <p key={line} className="text-muted mt-0.5">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* 3. Line items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-muted">
                          <th className="py-3 pr-4 text-left font-bold uppercase tracking-wider text-[10px]">
                            Description
                          </th>
                          <th className="py-3 px-2 text-center font-bold uppercase tracking-wider text-[10px]">
                            Qty
                          </th>
                          <th className="py-3 px-2 text-right font-bold uppercase tracking-wider text-[10px]">
                            Unit Price
                          </th>
                          <th className="py-3 pl-2 text-right font-bold uppercase tracking-wider text-[10px]">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invoice.items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-muted">
                              No invoice line items yet.
                            </td>
                          </tr>
                        ) : (
                          invoice.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-4 pr-4">
                                <span className="font-bold text-[#2A170F] block">
                                  {item.description}
                                </span>
                                {item.artist ? (
                                  <span className="text-[11px] text-muted block mt-0.5">
                                    {item.artist}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-4 text-center font-bold text-[#2A170F]">
                                {item.qty}
                              </td>
                              <td className="py-4 text-right font-medium text-muted">
                                {money(item.unitPrice, invoice.currency)}
                              </td>
                              <td className="py-4 text-right font-bold text-[#2A170F]">
                                {money(item.amount, invoice.currency)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Totals */}
                  <div className="flex flex-col items-end gap-3 pt-2 text-xs border-t border-gray-100">
                    <div className="w-full sm:w-72 flex justify-between text-muted">
                      <span>Subtotal</span>
                      <span className="font-bold text-[#2A170F]">
                        {money(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    <div className="w-full sm:w-72 flex justify-between text-muted">
                      <span>Shipping</span>
                      <span
                        className={`font-bold ${invoice.shipping <= 0 ? 'text-emerald-700' : 'text-[#2A170F]'}`}
                      >
                        {shippingLabel}
                      </span>
                    </div>
                    <div className="w-full sm:w-72 flex justify-between text-muted">
                      <span>Tax (0%)</span>
                      <span className="font-bold text-[#2A170F]">
                        {money(invoice.tax, invoice.currency)}
                      </span>
                    </div>

                    <div className="w-full sm:w-80 mt-2 p-4 bg-[#FAF6F2] rounded-2xl flex items-center justify-between border border-primary/5">
                      <span className="text-xs uppercase font-bold tracking-wider text-[#664132]">
                        TOTAL DUE
                      </span>
                      <span className="font-heading text-2xl font-bold text-[#8C523A]">
                        {money(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </div>

                  {/* 5. Payment strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-[#FAF6F2]/80 border border-primary/5 px-4 py-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">
                        Payment Status
                      </p>
                      <p className="font-bold text-[#2A170F] flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            /paid/i.test(invoice.paymentStatus)
                              ? 'bg-emerald-500'
                              : /cancel|refund/i.test(invoice.paymentStatus)
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                          }`}
                        />
                        {invoice.paymentStatus}
                        <span className="font-medium text-muted">
                          on {invoice.paymentStatusDate}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">
                        Payment Method
                      </p>
                      <p className="font-bold text-[#2A170F]">{invoice.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">
                        Transaction ID
                      </p>
                      <p className="font-bold text-[#2A170F] break-all">{invoice.transactionId}</p>
                    </div>
                  </div>

                  {/* 6. Notes / terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] text-muted leading-relaxed border-t border-gray-100 pt-6">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#664132] mb-1.5 text-[10px]">
                        Notes
                      </p>
                      <p>
                        Thank you for supporting Nepalese artisans. Each piece is handmade — slight
                        variations are part of its character.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#664132] mb-1.5 text-[10px]">
                        Terms &amp; Conditions
                      </p>
                      <p>
                        Returns accepted within 14 days of delivery for unused items in original
                        condition. Contact matinacrafts@gmail.com for support.
                      </p>
                    </div>
                  </div>

                  <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted pt-2">
                    Thank you for your business
                    <span className="block mt-1 normal-case tracking-normal text-muted/80">
                      © Matina Crafts · matinacrafts.com
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Invoice;
