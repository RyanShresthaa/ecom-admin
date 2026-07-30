'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

/** Confirmed orders: COD placed or online paid — not cancelled/failed. */
export function canShowInvoice(paymentStatus?: string, deliveryStatus?: string): boolean {
  const pay = (paymentStatus || '').toUpperCase();
  const delivery = (deliveryStatus || '').toLowerCase();

  if (delivery.includes('cancel') || delivery.includes('fail')) return false;
  if (pay.includes('FAIL') || pay.includes('CANCEL') || pay.includes('REFUNDED')) return false;

  return (
    pay.includes('PAID') ||
    pay.includes('CASH ON DELIVERY') ||
    pay.includes('COD') ||
    pay.length > 0
  );
}

type InvoiceButtonProps = {
  /** Order line id or checkout group id — opens designed Matina invoice page. */
  orderLineId: string | number;
  /** Optional group/order id preferred for the invoice URL when available. */
  orderId?: string | number;
  paymentStatus?: string;
  deliveryStatus?: string;
  className?: string;
  label?: string;
};

/**
 * Links to the designed `/orders/invoice` page (no iframe HTML viewer).
 */
export function InvoiceButton({
  orderLineId,
  orderId,
  paymentStatus,
  deliveryStatus,
  className = '',
  label,
}: InvoiceButtonProps) {
  if (!canShowInvoice(paymentStatus, deliveryStatus)) return null;

  const pay = (paymentStatus || '').toUpperCase();
  const buttonLabel =
    label ||
    (pay.includes('PAID') ? 'View invoice' : 'View order confirmation');

  const idForUrl = orderId != null && String(orderId).trim() !== '' ? orderId : orderLineId;
  const href = `/orders/invoice?id=${encodeURIComponent(String(idForUrl))}`;

  return (
    <Link
      href={href}
      className={
        className ||
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-colors'
      }
    >
      <Icon icon="ph:file-text" className="w-4 h-4" />
      {buttonLabel}
    </Link>
  );
}
