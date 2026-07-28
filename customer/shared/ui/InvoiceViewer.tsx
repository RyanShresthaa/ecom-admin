'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ApiError, fetchInvoiceHtml } from '@/lib/api';

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

type InvoiceViewerProps = {
  /** Numeric order line id (API `/order/invoice/:id`). */
  orderLineId: string | number | null;
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function InvoiceViewer({
  orderLineId,
  open,
  onClose,
  title = 'Invoice',
}: InvoiceViewerProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || orderLineId == null) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setHtml('');
      try {
        const content = await fetchInvoiceHtml(orderLineId);
        if (cancelled) return;
        if (!content.trim()) {
          setError('Invoice is not available for this order yet.');
        } else {
          setHtml(content);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setError('Sign in is required to view invoices.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load invoice');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, orderLineId]);

  if (!open) return null;

  function handlePrint() {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
    if (!win) return;
    win.document.write(html || '<p>No invoice</p>');
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#2A170F]/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-xl border border-primary/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary/10">
          <h2 className="font-heading text-lg font-semibold text-[#2A170F]">{title}</h2>
          <div className="flex items-center gap-2">
            {html && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary-dark hover:bg-primary-lighter/30"
              >
                <Icon icon="ph:printer" className="w-4 h-4" />
                Print
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-body/60 hover:bg-[#FAF6F2] hover:text-primary-dark"
              aria-label="Close"
            >
              <Icon icon="ph:x" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#FAF6F2] p-4 sm:p-6">
          {loading && (
            <p className="font-secondary text-sm text-primary text-center py-16">
              Loading invoice…
            </p>
          )}
          {!loading && error && (
            <p className="font-secondary text-sm text-red-600 text-center py-12">{error}</p>
          )}
          {!loading && !error && html && (
            <iframe
              title={title}
              srcDoc={html}
              className="w-full min-h-[60vh] rounded-2xl bg-white border border-primary/10"
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}

type InvoiceButtonProps = {
  orderLineId: string | number;
  paymentStatus?: string;
  deliveryStatus?: string;
  className?: string;
  label?: string;
};

export function InvoiceButton({
  orderLineId,
  paymentStatus,
  deliveryStatus,
  className = '',
  label,
}: InvoiceButtonProps) {
  const [open, setOpen] = useState(false);

  if (!canShowInvoice(paymentStatus, deliveryStatus)) return null;

  const pay = (paymentStatus || '').toUpperCase();
  const buttonLabel =
    label ||
    (pay.includes('PAID') ? 'View invoice' : 'View order confirmation');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-colors'
        }
      >
        <Icon icon="ph:file-text" className="w-4 h-4" />
        {buttonLabel}
      </button>
      <InvoiceViewer
        orderLineId={orderLineId}
        open={open}
        onClose={() => setOpen(false)}
        title={buttonLabel}
      />
    </>
  );
}
