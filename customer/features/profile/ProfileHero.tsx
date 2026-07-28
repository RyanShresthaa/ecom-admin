'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { hasSession, fetchUserProfile, type ApiUserProfile } from '@/lib/api';

export default function ProfileHero() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ApiUserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await hasSession();
        if (!ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const profile = await fetchUserProfile();
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4">
        <div className="container-custom max-w-2xl mx-auto text-center">
          <p className="font-secondary text-sm text-body/60">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4">
        <div className="container-custom max-w-xl mx-auto">
          <div className="bg-white rounded-3xl border border-primary/10 p-8 sm:p-10 shadow-xs text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mx-auto mb-5">
              <Icon icon="ph:user-circle" className="w-9 h-9" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] mb-3">
              Your account
            </h1>
            <p className="font-secondary text-sm text-body/70 leading-relaxed mb-2">
              Sign in to view your profile, addresses, and order history.
            </p>
            <p className="font-secondary text-xs text-body/50 mb-8">
              Customer login and registration pages are coming soon. Your cart and wishlist stay
              saved on this device in the meantime.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/cart"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
              >
                <Icon icon="ph:shopping-bag" className="w-4 h-4" />
                Cart
              </Link>
              <Link
                href="/wishlist"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-primary/25 text-primary-dark text-xs font-semibold uppercase tracking-wider"
              >
                <Icon icon="ph:heart" className="w-4 h-4" />
                Wishlist
              </Link>
              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-primary/25 text-primary-dark text-xs font-semibold uppercase tracking-wider sm:col-span-2"
              >
                <Icon icon="ph:package" className="w-4 h-4" />
                My orders
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4">
      <div className="container-custom max-w-2xl mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-3xl border border-primary/10 p-8 shadow-xs">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-heading text-2xl font-bold">
              {initial}
            </div>
            <div className="min-w-0 text-left">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2A170F] truncate">
                {user.name || 'Customer'}
              </h1>
              <p className="font-secondary text-sm text-body/70 truncate">{user.email}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-secondary text-sm">
            <div className="rounded-2xl bg-[#FAF6F2] border border-primary/10 p-4">
              <dt className="text-xs uppercase tracking-wider text-body/50 mb-1">Phone</dt>
              <dd className="text-primary-dark">{user.mobile || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-[#FAF6F2] border border-primary/10 p-4">
              <dt className="text-xs uppercase tracking-wider text-body/50 mb-1">Role</dt>
              <dd className="text-primary-dark capitalize">{user.role || 'Customer'}</dd>
            </div>
          </dl>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/orders"
            className="bg-white rounded-2xl border border-primary/10 p-5 hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <Icon icon="ph:package" className="w-5 h-5 text-primary" />
            <span className="font-heading font-semibold text-[#2A170F]">Orders</span>
            <span className="font-secondary text-xs text-body/60">Track and invoice past orders</span>
          </Link>
          <Link
            href="/wishlist"
            className="bg-white rounded-2xl border border-primary/10 p-5 hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <Icon icon="ph:heart" className="w-5 h-5 text-primary" />
            <span className="font-heading font-semibold text-[#2A170F]">Wishlist</span>
            <span className="font-secondary text-xs text-body/60">Saved crafts</span>
          </Link>
          <Link
            href="/cart"
            className="bg-white rounded-2xl border border-primary/10 p-5 hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <Icon icon="ph:shopping-bag" className="w-5 h-5 text-primary" />
            <span className="font-heading font-semibold text-[#2A170F]">Cart</span>
            <span className="font-secondary text-xs text-body/60">Continue to checkout</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
