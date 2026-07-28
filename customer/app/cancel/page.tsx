'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { reportCartAbandon } from '@/lib/api';

/** Stripe Checkout cancel_url target (`FRONTEND_URL/cancel`). */
export default function PaymentCancelPage() {
  useEffect(() => {
    void reportCartAbandon('stripe_cancel');
  }, []);

  return (
    <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20">
      <div className="container-custom max-w-xl mx-auto px-4 text-center bg-white rounded-3xl border border-primary/10 p-10 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mx-auto mb-5">
          <Icon icon="ph:x-bold" className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#2A170F] mb-2">Payment cancelled</h1>
        <p className="font-secondary text-sm text-body/70 mb-8">
          No charge was made. Your cart is still available — you can try again or switch to cash on
          delivery.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/checkout"
            className="px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
          >
            Back to checkout
          </Link>
          <Link
            href="/cart"
            className="px-6 py-3 rounded-full border border-primary/25 text-primary-dark text-xs font-semibold uppercase tracking-wider"
          >
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}
