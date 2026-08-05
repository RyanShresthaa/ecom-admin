'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import {
  ApiError,
  deletePaymentMethod,
  fetchPaymentMethods,
  type ApiPaymentMethod,
} from '@/lib/api';

export interface CardItem {
  id: string;
  type: string;
  nameOnCard: string;
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
  colorScheme: 'dark' | 'bronze' | 'navy';
}

function mapMethod(row: ApiPaymentMethod, index: number): CardItem {
  const brand = String(row.brand || row.type || 'Card');
  const schemes: Array<'dark' | 'bronze' | 'navy'> = ['dark', 'bronze', 'navy'];
  return {
    id: String(row.id ?? row._id ?? ''),
    type: brand.charAt(0).toUpperCase() + brand.slice(1),
    nameOnCard: row.billing_name || '—',
    last4: row.last4 || '••••',
    expMonth: row.exp_month != null ? String(row.exp_month).padStart(2, '0') : '—',
    expYear: row.exp_year != null ? String(row.exp_year).slice(-2) : '—',
    isDefault: Boolean(row.is_default ?? row.isDefault ?? index === 0),
    colorScheme: schemes[index % schemes.length],
  };
}

const Payment: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchPaymentMethods();
        if (!cancelled) setCards(rows.map(mapMethod));
      } catch (err) {
        if (!cancelled) {
          setCards([]);
          setError(err instanceof ApiError ? err.message : 'Could not load payment methods.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return null;
  }

  const handleRemove = async (id: string) => {
    setError('');
    try {
      await deletePaymentMethod(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      setNotification('Card removed successfully.');
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove card.');
    }
  };

  return (
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          <ProfileSidebar active="payments" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 lg:gap-[1.5vw]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 lg:gap-[1vw]">
              <div>
                <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                  ACCOUNT
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                  Payment Methods
                </h1>
                <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                  Manage your saved credit and debit cards
                </p>
              </div>

              <Link
                href="/payments/new"
                className="px-6 lg:px-[1.5vw] py-3 lg:py-[0.7vw] bg-[#7C4831] hover:bg-[#5C321E] text-white font-bold text-xs lg:text-[0.75vw] rounded-full transition-all flex items-center gap-2 lg:gap-[0.4vw] cursor-pointer shrink-0 shadow-xs active:scale-98"
              >
                <Icon icon="lucide:plus" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                <span>Add New Card</span>
              </Link>
            </div>

            {notification ? (
              <div className="p-3 lg:p-[0.8vw] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs lg:text-[0.75vw] rounded-2xl lg:rounded-[1vw] flex items-center gap-2 lg:gap-[0.4vw]">
                <Icon icon="lucide:check-circle" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-emerald-600 shrink-0" />
                <span>{notification}</span>
              </div>
            ) : null}

            {error ? (
              <div className="p-3 lg:p-[0.8vw] bg-red-50 border border-red-200 text-red-800 text-xs lg:text-[0.75vw] rounded-2xl lg:rounded-[1vw]">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-10 lg:p-[2.5vw] border border-primary/10 text-center text-xs lg:text-[0.75vw] text-muted">
                Loading payment methods…
              </div>
            ) : cards.length === 0 ? (
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-10 lg:p-[2.5vw] border border-primary/10 text-center">
                <div className="w-14 h-14 lg:w-[3.5vw] lg:h-[3.5vw] rounded-full bg-[#F7F0E9] text-primary flex items-center justify-center mx-auto mb-4 lg:mb-[1vw]">
                  <Icon icon="ph:credit-card" className="w-7 h-7 lg:w-[1.8vw] lg:h-[1.8vw]" />
                </div>
                <h3 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">No cards yet</h3>
                <p className="font-secondary text-xs lg:text-[0.75vw] text-body/70 mt-1 mb-5 lg:mb-[1.2vw] max-w-md lg:max-w-none mx-auto">
                  Save a card so checkout can reuse it. Charges still go through Stripe securely.
                </p>
                <Link
                  href="/payments/new"
                  className="inline-flex items-center gap-2 lg:gap-[0.4vw] px-6 lg:px-[1.5vw] py-3 lg:py-[0.7vw] bg-[#7C4831] hover:bg-[#5C321E] text-white font-bold text-xs lg:text-[0.75vw] rounded-full"
                >
                  <Icon icon="lucide:plus" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                  Add New Card
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-[1.5vw]">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 overflow-hidden"
                  >
                    <div
                      className={`p-6 lg:p-[1.5vw] text-white ${
                        card.colorScheme === 'bronze'
                          ? 'bg-[#8C523A]'
                          : card.colorScheme === 'navy'
                            ? 'bg-[#2A3F5F]'
                            : 'bg-[#2E2F33]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-8 lg:mb-[2vw]">
                        <span className="text-xs lg:text-[0.75vw] font-bold uppercase tracking-widest opacity-80">
                          {card.type}
                        </span>
                        {card.isDefault ? (
                          <span className="px-2.5 lg:px-[0.6vw] py-1 lg:py-[0.25vw] bg-white/15 text-[10px] lg:text-[0.65vw] font-bold rounded-full">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="font-mono text-lg lg:text-[1.2vw] tracking-widest mb-6 lg:mb-[1.5vw]">•••• •••• •••• {card.last4}</p>
                      <div className="flex justify-between text-xs lg:text-[0.75vw]">
                        <div>
                          <span className="opacity-70 block mb-0.5 lg:mb-[0.1vw]">Name</span>
                          <span className="font-semibold uppercase">{card.nameOnCard}</span>
                        </div>
                        <div className="text-right">
                          <span className="opacity-70 block mb-0.5 lg:mb-[0.1vw]">Expires</span>
                          <span className="font-semibold">
                            {card.expMonth}/{card.expYear}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 lg:p-[1vw] flex gap-3 lg:gap-[0.8vw]">
                      <Link
                        href={`/payments/edit?id=${encodeURIComponent(card.id)}`}
                        className="flex-1 py-2 lg:py-[0.5vw] rounded-full border border-[#E2D5C7] text-[#2A170F] text-xs lg:text-[0.75vw] font-semibold hover:bg-[#FAF6F2] text-center"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(card.id)}
                        className="flex-1 py-2 lg:py-[0.5vw] rounded-full border border-[#E2D5C7] text-red-700 text-xs lg:text-[0.75vw] font-semibold hover:bg-red-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payment;
