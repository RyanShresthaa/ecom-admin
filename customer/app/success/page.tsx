'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useCart } from '@/shared/context/CartContext';
import { ApiError, confirmOnlineOrder, type ApiOrder } from '@/lib/api';
import { InvoiceButton } from '@/shared/ui/InvoiceViewer';

function PaymentSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId');
  const { clearCart, clearPromoCode } = useCart();
  const cleared = useRef(false);
  const [status, setStatus] = useState<'idle' | 'confirming' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState<ApiOrder[]>([]);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clearCart();
    clearPromoCode();
  }, [clearCart, clearPromoCode]);

  useEffect(() => {
    if (!sessionId) {
      setStatus('ok');
      setMessage('Payment received. Open My Orders to view your invoice.');
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('confirming');
      try {
        const rows = await confirmOnlineOrder(sessionId);
        if (cancelled) return;
        setOrders(rows);
        setStatus('ok');
        setMessage('Your order is confirmed. Thank you for shopping with Matina Crafts.');
      } catch (err) {
        if (cancelled) return;
        setStatus('err');
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setMessage(
            'Payment succeeded, but we could not finalize the order in this browser session. Sign in and open My Orders — the webhook may still create it.',
          );
        } else {
          setMessage(
            err instanceof Error
              ? err.message
              : 'Payment may have succeeded, but order confirmation failed. Check My Orders shortly.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const invoiceLineId = orders[0] ? String(orders[0].id ?? orders[0]._id ?? '') : '';

  return (
    <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20">
      <div className="container-custom max-w-xl mx-auto px-4 text-center bg-white rounded-3xl border border-primary/10 p-10 shadow-xs">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            status === 'err' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          <Icon
            icon={status === 'err' ? 'ph:warning-bold' : 'ph:check-bold'}
            className="w-8 h-8"
          />
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#2A170F] mb-2">
          {status === 'confirming'
            ? 'Confirming payment…'
            : status === 'err'
              ? 'Payment received'
              : 'Payment successful'}
        </h1>
        <p className="font-secondary text-sm text-body/70 mb-8">
          {status === 'confirming' ? 'Finalizing your order with the payment session…' : message}
        </p>

        {invoiceLineId && (
          <div className="mb-8 flex justify-center">
            <InvoiceButton
              orderLineId={invoiceLineId}
              paymentStatus="PAID"
              deliveryStatus={orders[0]?.delivery_status}
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
          >
            View my orders
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 rounded-full border border-primary/25 text-primary-dark text-xs font-semibold uppercase tracking-wider"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Stripe Checkout success_url target (`FRONTEND_URL/success?session_id=...`). */
export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 text-center font-secondary text-sm text-body/70">
          Loading…
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}
