'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import {
  ApiError,
  fetchMyOrders,
  fetchMyReturns,
  hasSession,
  requestReturn,
  type ApiOrder,
  type ApiReturn,
} from '@/lib/api';
import { InvoiceButton } from '@/shared/ui/InvoiceViewer';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';

type GroupedOrder = {
  orderId: string;
  /** First line row id — used for GET /order/invoice/:id */
  invoiceLineId: string;
  createdAt?: string;
  payment_status?: string;
  delivery_status?: string;
  totalAmt: number;
  couponCode?: string | null;
  lines: ApiOrder[];
};

function groupOrders(rows: ApiOrder[]): GroupedOrder[] {
  const map = new Map<string, GroupedOrder>();
  for (const row of rows) {
    const key = String(row.orderId || row.id || row._id);
    const existing = map.get(key);
    const lineTotal = Number(row.lineTotal ?? row.totalAmt ?? 0);
    const name =
      (typeof row.product_details === 'object' && row.product_details?.name) ||
      (typeof row.productId === 'object' && row.productId?.name) ||
      `Item #${row.id ?? row._id}`;

    const enriched = { ...row, _displayName: name } as ApiOrder & { _displayName?: string };
    const lineId = String(row.id ?? row._id ?? '');

    if (!existing) {
      map.set(key, {
        orderId: key,
        invoiceLineId: lineId,
        createdAt: row.createdAt,
        payment_status: row.payment_status,
        delivery_status: row.delivery_status,
        totalAmt: Number(row.totalAmt ?? lineTotal),
        couponCode: row.couponCode,
        lines: [enriched],
      });
    } else {
      existing.lines.push(enriched);
      existing.totalAmt = Math.max(existing.totalAmt, Number(row.totalAmt ?? 0));
      if (!existing.invoiceLineId && lineId) existing.invoiceLineId = lineId;
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function returnKey(r: ApiReturn): string {
  return String(r.order_row_id ?? r.orderRowId ?? '');
}

export default function Orders() {
  const { formatMoney } = useShopLocale();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [returns, setReturns] = useState<ApiReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returnLineId, setReturnLineId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnMsg, setReturnMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const ok = await hasSession();
      setLoggedIn(ok);
      if (!ok) {
        setOrders([]);
        setReturns([]);
        return;
      }
      const [rows, ret] = await Promise.all([fetchMyOrders(), fetchMyReturns().catch(() => [])]);
      setOrders(rows);
      setReturns(ret);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setLoggedIn(false);
        setOrders([]);
        setReturns([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => groupOrders(orders), [orders]);
  const returnsByLine = useMemo(() => {
    const m = new Map<string, ApiReturn>();
    for (const r of returns) {
      const k = returnKey(r);
      if (k) m.set(k, r);
    }
    return m;
  }, [returns]);

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnLineId || !returnReason.trim()) return;
    setReturnBusy(true);
    setReturnMsg('');
    try {
      await requestReturn({ orderRowId: returnLineId, reason: returnReason.trim() });
      setReturnMsg('Return requested. We will review it shortly.');
      setReturnReason('');
      setReturnLineId('');
      const ret = await fetchMyReturns();
      setReturns(ret);
    } catch (err) {
      setReturnMsg(err instanceof Error ? err.message : 'Could not request return');
    } finally {
      setReturnBusy(false);
    }
  };

  return (
    <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 select-none">
      <div className="container-custom max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#2A170F] tracking-tight mb-2">
          My Orders
        </h1>
        <p className="font-secondary text-sm text-body/70 mb-10">
          Track your Matina Crafts purchases.
        </p>

        {loading && (
          <p className="font-secondary text-sm text-primary text-center py-16">Loading orders…</p>
        )}

        {!loading && loggedIn === false && (
          <div className="bg-white rounded-3xl border border-primary/10 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mx-auto mb-5">
              <Icon icon="ph:user-circle" className="w-8 h-8" />
            </div>
            <h2 className="font-heading text-2xl font-medium text-primary-dark mb-2">
              Sign in to view orders
            </h2>
            <p className="font-secondary text-sm text-body/70 max-w-md mx-auto mb-8">
              Orders sync to your account after checkout. Login is coming soon — your guest cart and
              wishlist already work on this device.
            </p>
            <Link
              href="/products"
              className="inline-flex px-8 py-3.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
            >
              Continue shopping
            </Link>
          </div>
        )}

        {!loading && loggedIn && error && (
          <p className="text-sm text-red-600 font-secondary text-center py-8">{error}</p>
        )}

        {!loading && loggedIn && !error && grouped.length === 0 && (
          <div className="bg-white rounded-3xl border border-primary/10 p-12 text-center shadow-xs">
            <h2 className="font-heading text-2xl font-medium text-primary-dark mb-2">
              No orders yet
            </h2>
            <p className="font-secondary text-sm text-body/70 mb-8">
              When you place a COD order, it will show up here.
            </p>
            <Link
              href="/products"
              className="inline-flex px-8 py-3.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
            >
              Browse products
            </Link>
          </div>
        )}

        {!loading && loggedIn && grouped.length > 0 && (
          <div className="flex flex-col gap-5">
            {grouped.map((order) => (
              <article
                key={order.orderId}
                className="bg-white rounded-3xl border border-primary/10 p-6 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-mono text-xs text-body/50 mb-1">Order #{order.orderId}</p>
                    <p className="font-heading text-lg font-semibold text-[#2A170F]">
                      {formatMoney(order.totalAmt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.payment_status && (
                      <span className="px-3 py-1 rounded-full bg-[#F5ECE8] text-[10px] font-bold uppercase tracking-wider text-primary">
                        {order.payment_status}
                      </span>
                    )}
                    {order.delivery_status && (
                      <span className="px-3 py-1 rounded-full border border-primary/15 text-[10px] font-bold uppercase tracking-wider text-primary-dark">
                        {order.delivery_status}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="flex flex-col gap-2 font-secondary text-sm text-body/80">
                  {order.lines.map((line, idx) => {
                    const label =
                      (line as ApiOrder & { _displayName?: string })._displayName ||
                      `Line ${idx + 1}`;
                    const lid = String(line.id ?? line._id ?? '');
                    const existing = returnsByLine.get(lid);
                    return (
                      <li key={lid || idx} className="flex flex-col gap-1">
                        <div className="flex justify-between gap-4">
                          <span className="truncate">
                            {label}
                            {line.quantity ? ` × ${line.quantity}` : ''}
                          </span>
                          <span className="shrink-0 font-semibold text-primary-dark">
                            {formatMoney(Number(line.lineTotal ?? 0))}
                          </span>
                        </div>
                        {existing && (
                          <span className="text-[11px] text-amber-800">
                            Return: {existing.status || 'pending'}
                            {existing.reason ? ` — ${existing.reason}` : ''}
                          </span>
                        )}
                        {!existing && lid && (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnLineId(lid);
                              setReturnMsg('');
                            }}
                            className="self-start text-[11px] font-semibold uppercase tracking-wider text-primary underline-offset-2 hover:underline"
                          >
                            Request return
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {order.couponCode && (
                  <p className="mt-3 text-xs font-secondary text-emerald-700">
                    Coupon: {order.couponCode}
                  </p>
                )}

                {order.createdAt && (
                  <p className="mt-2 text-[11px] font-secondary text-body/50">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                )}

                {order.invoiceLineId && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <InvoiceButton
                      orderLineId={order.invoiceLineId}
                      paymentStatus={order.payment_status}
                      deliveryStatus={order.delivery_status}
                    />
                  </div>
                )}
              </article>
            ))}

            {returnLineId && (
              <form
                onSubmit={handleReturn}
                className="bg-white rounded-3xl border border-primary/10 p-6 shadow-xs"
              >
                <h2 className="font-heading text-xl text-primary-dark mb-2">Request a return</h2>
                <p className="font-secondary text-xs text-body/60 mb-4">
                  Line #{returnLineId}. Tell us why you want to return this item.
                </p>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-2xl border border-primary/20 px-4 py-3 font-secondary text-sm mb-3 focus:outline-none focus:border-primary"
                  placeholder="Reason for return"
                />
                {returnMsg && (
                  <p className="text-sm font-secondary mb-3 text-body/80">{returnMsg}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={returnBusy}
                    className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-60"
                  >
                    {returnBusy ? 'Submitting…' : 'Submit return'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnLineId('');
                      setReturnReason('');
                      setReturnMsg('');
                    }}
                    className="px-5 py-2.5 rounded-full border border-primary/20 text-primary-dark text-xs font-semibold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {returns.length > 0 && !returnLineId && (
              <section className="bg-white rounded-3xl border border-primary/10 p-6 shadow-xs">
                <h2 className="font-heading text-xl text-primary-dark mb-4">My returns</h2>
                <ul className="flex flex-col gap-3 font-secondary text-sm">
                  {returns.map((r) => (
                    <li
                      key={String(r.id ?? r._id)}
                      className="flex flex-wrap justify-between gap-2 border-b border-primary/8 pb-3 last:border-0"
                    >
                      <span>
                        Line #{returnKey(r) || '—'}
                        {r.reason ? ` — ${r.reason}` : ''}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {r.status || 'pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
