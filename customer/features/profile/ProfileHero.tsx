'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import { useCart } from '@/shared/context/CartContext';
import { useWishlist } from '@/shared/context/WishlistContext';
import SmartImage from '@/shared/ui/SmartImage';
import { fetchAddresses, fetchMyOrders, formatMoney, type ApiOrder } from '@/lib/api';

type RecentOrderRow = {
  id: string;
  title: string;
  date: string;
  itemsCount: number;
  total: string;
  status: string;
  image: string;
};

function resolveProductImage(product: {
  image?: unknown;
  image_url?: string | null;
} | null): string {
  if (!product) return '/images/hero/gallery/center-left.png';
  const fromArray =
    Array.isArray(product.image) && product.image.length > 0
      ? String(product.image[0] || '')
      : typeof product.image === 'string'
        ? product.image
        : '';
  const raw = (fromArray || product.image_url || '').trim();
  if (!raw) return '/images/hero/gallery/center-left.png';
  // Strip local API host so Next can serve /public paths
  return raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/i, '') || raw;
}

function mapOrders(orders: ApiOrder[]): RecentOrderRow[] {
  return orders.slice(0, 5).map((o) => {
    const product =
      (typeof o.productId === 'object' && o.productId) || o.product_details || null;
    const image = resolveProductImage(product);
    const title = product?.name || 'Order item';
    const status = o.delivery_status || o.payment_status || 'Processing';
    const totalNum = Number(o.totalAmt ?? o.lineTotal ?? o.subTotalAmt ?? 0);
    const date = o.createdAt
      ? new Date(o.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';
    return {
      id: String(o.orderId || o.id || o._id || ''),
      title,
      date,
      itemsCount: Number(o.quantity ?? 1),
      total: formatMoney(totalNum),
      status,
      image: String(image),
    };
  });
}

const ProfileHero: React.FC = () => {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const { wishlist, totalWishlistItems } = useWishlist();
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      try {
        const [orders, addresses] = await Promise.all([
          fetchMyOrders(),
          fetchAddresses().catch(() => []),
        ]);
        if (!cancelled) {
          setRecentOrders(mapOrders(orders));
          setOrderCount(orders.length);
          setAddressCount(addresses.length);
        }
      } catch {
        if (!cancelled) {
          setRecentOrders([]);
          setOrderCount(0);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return null;
  }

  const firstName = user.name ? user.name.split(' ')[0] : 'Member';
  const wishlistPreview = wishlist.slice(0, 3);
  return (
    <section className="min-h-screen bg-[#FAF6F2] pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 select-none">
      <div className="container-custom max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <ProfileSidebar active="dashboard" />

          {/* RIGHT MAIN CONTENT */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
            
            {/* Header Greeting */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] tracking-tight">
                Welcome back, {firstName}.
              </h1>
              <p className="font-secondary text-xs sm:text-sm text-body/80 mt-1">
                Here&apos;s a summary of your recent activity and saved items.
              </p>
            </div>

            {/* 4 Stats Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href="/orders"
                className="bg-white rounded-3xl p-5 border border-primary/10 flex flex-col justify-between min-h-[120px] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#F7F0E9] flex items-center justify-center text-primary mb-3">
                  <Icon icon="ph:package-bold" className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#2A170F] font-heading block leading-none">
                    {ordersLoading ? '—' : orderCount}
                  </span>
                  <span className="text-[11px] text-muted font-medium mt-1 block">
                    Total Orders
                  </span>
                </div>
              </Link>

              <Link
                href="/wishlist"
                className="bg-white rounded-3xl p-5 border border-primary/10 flex flex-col justify-between min-h-[120px] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#F7F0E9] flex items-center justify-center text-[#B87A5E] mb-3">
                  <Icon icon="ph:heart-bold" className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#2A170F] font-heading block leading-none">
                    {totalWishlistItems}
                  </span>
                  <span className="text-[11px] text-muted font-medium mt-1 block">
                    Wishlist Items
                  </span>
                </div>
              </Link>

              <Link
                href="/cart"
                className="bg-white rounded-3xl p-5 border border-primary/10 flex flex-col justify-between min-h-[120px] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#EBF3FE] flex items-center justify-center text-blue-600 mb-3">
                  <Icon icon="ph:shopping-bag-bold" className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#2A170F] font-heading block leading-none">
                    {totalItems}
                  </span>
                  <span className="text-[11px] text-muted font-medium mt-1 block">
                    Cart Items
                  </span>
                </div>
              </Link>

              <Link
                href="/addresses"
                className="bg-white rounded-3xl p-5 border border-primary/10 flex flex-col justify-between min-h-[120px] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#E6F6ED] flex items-center justify-center text-emerald-600 mb-3">
                  <Icon icon="ph:map-pin-bold" className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#2A170F] font-heading block leading-none">
                    {addressCount}
                  </span>
                  <span className="text-[11px] text-muted font-medium mt-1 block">
                    Saved Addresses
                  </span>
                </div>
              </Link>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-primary/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-xl font-bold text-[#2A170F]">
                  Recent Orders
                </h3>
                <Link
                  href="/orders"
                  className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Table / Order List */}
              <div className="overflow-x-auto">
                {!ordersLoading && recentOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F7F0E9] text-primary flex items-center justify-center mx-auto mb-4">
                      <Icon icon="ph:package" className="w-7 h-7" />
                    </div>
                    <p className="font-heading text-lg font-bold text-[#2A170F]">No orders yet</p>
                    <p className="font-secondary text-xs text-body/70 mt-1 mb-5 max-w-sm mx-auto">
                      When you place an order, it will show up here.
                    </p>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7C4831] text-white text-xs font-bold"
                    >
                      Start shopping
                    </Link>
                  </div>
                ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-bold tracking-wider text-muted/70 pb-3">
                      <th className="pb-3 font-semibold">ORDER</th>
                      <th className="pb-3 font-semibold">DATE</th>
                      <th className="pb-3 font-semibold text-center">ITEMS</th>
                      <th className="pb-3 font-semibold">TOTAL</th>
                      <th className="pb-3 font-semibold">STATUS</th>
                      <th className="pb-3 font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted">
                          Loading orders…
                        </td>
                      </tr>
                    ) : null}
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Order info with image */}
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#F5ECE8] shrink-0 border border-primary/10">
                              <SmartImage
                                src={order.image}
                                alt={order.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-[#2A170F] block">
                                {order.id}
                              </span>
                              <span className="text-[11px] text-muted truncate max-w-[180px] block">
                                {order.title}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 text-muted font-medium">
                          {order.date}
                        </td>

                        {/* Items count */}
                        <td className="py-4 text-center font-bold text-[#2A170F]">
                          {order.itemsCount}
                        </td>

                        {/* Total */}
                        <td className="py-4 font-bold text-[#2A170F]">
                          {order.total}
                        </td>

                        {/* Status pill */}
                        <td className="py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              String(order.status).toLowerCase().includes('deliver')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* Details Link */}
                        <td className="py-4 text-right">
                          <Link
                            href="/orders"
                            className="text-xs font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                            <Icon icon="lucide:arrow-right" className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </div>

            {/* Full Width Wishlist Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-primary/10 w-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-xl font-bold text-[#2A170F]">
                  Wishlist
                </h3>
                <Link
                  href="/wishlist"
                  className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                </Link>
              </div>

              {wishlistPreview.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-heading text-base font-bold text-[#2A170F]">Wishlist is empty</p>
                  <p className="font-secondary text-xs text-body/70 mt-1 mb-4">
                    Save items you love while browsing the shop.
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/25 text-primary-dark text-xs font-bold"
                  >
                    Browse products
                  </Link>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wishlistPreview.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#FAF6F2] rounded-2xl flex items-center justify-between border border-primary/5 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0">
                        <SmartImage
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#2A170F] block">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-semibold text-primary block mt-0.5">
                          {item.priceString}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/products/${item.slug}`}
                      className="px-4 py-1.5 bg-[#7C4831] hover:bg-[#5C321E] text-white text-[11px] font-bold rounded-full transition-colors cursor-pointer shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Complete profile CTA */}
            <div className="bg-[#5C321E] text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                  <Icon icon="ph:user-circle-plus-bold" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200 block">
                    YOUR ACCOUNT
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-white mt-0.5">
                    Finish setting up
                  </h3>
                  <p className="text-xs text-white/80 mt-1 max-w-lg leading-relaxed">
                    Add a shipping address and payment method so checkout is faster next time.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
                <Link
                  href="/addresses/new"
                  className="px-6 py-2.5 bg-[#D4A373] hover:bg-[#C28F5F] text-[#3D1E10] font-bold text-xs rounded-full transition-colors text-center"
                >
                  Add address
                </Link>
                <Link
                  href="/settings"
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full transition-colors text-center"
                >
                  Account settings
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default ProfileHero;