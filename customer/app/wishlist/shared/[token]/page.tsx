'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import UserAvatar from '@/shared/ui/UserAvatar';
import {
  ApiError,
  fetchSharedWishlist,
  wishlistLineToLocal,
  type SharedWishlistPayload,
} from '@/lib/api';

export default function SharedWishlistPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [payload, setPayload] = useState<SharedWishlistPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchSharedWishlist(token);
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          setPayload(null);
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Shared wishlist not found',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const items =
    payload?.items?.map((row) =>
      wishlistLineToLocal({
        id: row.id,
        product_id: row.productId,
        product: row.product,
      }),
    ) ?? [];

  return (
    <main className="min-h-screen bg-[#FAF6F2] pt-24 pb-16 px-4 sm:px-6">
      <div className="container-custom max-w-5xl mx-auto">
        {loading && (
          <p className="text-center text-sm text-body/70 py-20">Loading shared wishlist…</p>
        )}

        {!loading && error && (
          <div className="bg-white rounded-3xl border border-primary/10 p-10 text-center">
            <Icon icon="ph:heart-break-bold" className="w-10 h-10 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#2A170F] mb-2">
              Wishlist unavailable
            </h1>
            <p className="text-sm text-body/70 mb-6">{error}</p>
            <Link
              href="/products"
              className="inline-flex px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
            >
              Continue shopping
            </Link>
          </div>
        )}

        {!loading && payload && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={payload.owner.name}
                  avatar={payload.owner.avatar}
                  size={56}
                />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9E7D6F] block mb-1">
                    Shared wishlist
                  </span>
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] tracking-tight">
                    {payload.owner.name}&apos;s picks
                  </h1>
                  <p className="text-sm text-body/70 mt-1">
                    {items.length} {items.length === 1 ? 'piece' : 'pieces'} saved
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="px-5 py-2.5 rounded-full border border-primary/20 bg-white text-xs font-semibold text-body/80 hover:bg-primary-lighter/40"
              >
                Browse collection
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-primary/10">
                <p className="text-sm text-body/70">This wishlist is empty right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="bg-white rounded-3xl border border-primary/10 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-[4/5] bg-[#F5ECE8]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-primary/40">
                          <Icon icon="ph:image" className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">
                        {item.category}
                      </p>
                      <h2 className="font-heading text-lg font-bold text-[#2A170F] line-clamp-2">
                        {item.name}
                      </h2>
                      <p className="text-sm font-semibold text-primary mt-2">{item.priceString}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
