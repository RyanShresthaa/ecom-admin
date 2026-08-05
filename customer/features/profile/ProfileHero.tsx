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
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          
          <ProfileSidebar active="dashboard" />

          {/* RIGHT MAIN CONTENT */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8 lg:gap-[2vw]">
            
            {/* Header Greeting */}
            <div>
              <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                Welcome back, {firstName}.
              </h1>
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                Here&apos;s a summary of your recent activity and saved items.
              </p>
            </div>

            {/* 4 Stats Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-[1vw]">
              <Link
                href="/orders"
                className="bg-white rounded-3xl lg:rounded-[1.5vw] p-5 lg:p-[1.2vw] border border-primary/10 flex flex-col justify-between min-h-[120px] lg:min-h-[7vw] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full bg-[#F7F0E9] flex items-center justify-center text-primary mb-3 lg:mb-[0.8vw]">
                  <Icon icon="ph:package-bold" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl lg:text-[1.8vw] font-bold text-[#2A170F] font-heading block leading-none">
                    {ordersLoading ? '—' : orderCount}
                  </span>
                  <span className="text-[11px] lg:text-[0.7vw] text-muted font-medium mt-1 lg:mt-[0.2vw] block">
                    Total Orders
                  </span>
                </div>
              </Link>

              <Link
                href="/wishlist"
                className="bg-white rounded-3xl lg:rounded-[1.5vw] p-5 lg:p-[1.2vw] border border-primary/10 flex flex-col justify-between min-h-[120px] lg:min-h-[7vw] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full bg-[#F7F0E9] flex items-center justify-center text-[#B87A5E] mb-3 lg:mb-[0.8vw]">
                  <Icon icon="ph:heart-bold" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl lg:text-[1.8vw] font-bold text-[#2A170F] font-heading block leading-none">
                    {totalWishlistItems}
                  </span>
                  <span className="text-[11px] lg:text-[0.7vw] text-muted font-medium mt-1 lg:mt-[0.2vw] block">
                    Wishlist Items
                  </span>
                </div>
              </Link>

              <Link
                href="/cart"
                className="bg-white rounded-3xl lg:rounded-[1.5vw] p-5 lg:p-[1.2vw] border border-primary/10 flex flex-col justify-between min-h-[120px] lg:min-h-[7vw] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full bg-[#EBF3FE] flex items-center justify-center text-blue-600 mb-3 lg:mb-[0.8vw]">
                  <Icon icon="ph:shopping-bag-bold" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl lg:text-[1.8vw] font-bold text-[#2A170F] font-heading block leading-none">
                    {totalItems}
                  </span>
                  <span className="text-[11px] lg:text-[0.7vw] text-muted font-medium mt-1 lg:mt-[0.2vw] block">
                    Cart Items
                  </span>
                </div>
              </Link>

              <Link
                href="/addresses"
                className="bg-white rounded-3xl lg:rounded-[1.5vw] p-5 lg:p-[1.2vw] border border-primary/10 flex flex-col justify-between min-h-[120px] lg:min-h-[7vw] hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full bg-[#E6F6ED] flex items-center justify-center text-emerald-600 mb-3 lg:mb-[0.8vw]">
                  <Icon icon="ph:map-pin-bold" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl lg:text-[1.8vw] font-bold text-[#2A170F] font-heading block leading-none">
                    {addressCount}
                  </span>
                  <span className="text-[11px] lg:text-[0.7vw] text-muted font-medium mt-1 lg:mt-[0.2vw] block">
                    Saved Addresses
                  </span>
                </div>
              </Link>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-7 lg:p-[1.8vw] border border-primary/10">
              <div className="flex items-center justify-between mb-6 lg:mb-[1.5vw]">
                <h3 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">
                  Recent Orders
                </h3>
                <Link
                  href="/orders"
                  className="text-xs lg:text-[0.75vw] font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 lg:gap-[0.3vw] cursor-pointer"
                >
                  <span>View All</span>
                  <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
                </Link>
              </div>

              {/* Table / Order List */}
              <div className="overflow-x-auto">
                {!ordersLoading && recentOrders.length === 0 ? (
                  <div className="py-10 lg:py-[2.5vw] text-center">
                    <div className="w-14 h-14 lg:w-[3.5vw] lg:h-[3.5vw] rounded-full bg-[#F7F0E9] text-primary flex items-center justify-center mx-auto mb-4 lg:mb-[1vw]">
                      <Icon icon="ph:package" className="w-7 h-7 lg:w-[1.8vw] lg:h-[1.8vw]" />
                    </div>
                    <p className="font-heading text-lg lg:text-[1.2vw] font-bold text-[#2A170F]">No orders yet</p>
                    <p className="font-secondary text-xs lg:text-[0.75vw] text-body/70 mt-1 mb-5 lg:mb-[1.2vw] max-w-sm lg:max-w-none mx-auto">
                      When you place an order, it will show up here.
                    </p>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 lg:gap-[0.4vw] px-5 lg:px-[1.2vw] py-2.5 lg:py-[0.6vw] rounded-full bg-[#7C4831] text-white text-xs lg:text-[0.75vw] font-bold"
                    >
                      Start shopping
                    </Link>
                  </div>
                ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] lg:text-[0.65vw] uppercase font-bold tracking-wider text-muted/70 pb-3 lg:pb-[0.8vw]">
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold">ORDER</th>
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold">DATE</th>
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold text-center">ITEMS</th>
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold">TOTAL</th>
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold">STATUS</th>
                      <th className="pb-3 lg:pb-[0.8vw] font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs lg:text-[0.75vw]">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 lg:py-[2vw] text-center text-muted">
                          Loading orders…
                        </td>
                      </tr>
                    ) : null}
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Order info with image */}
                        <td className="py-4 lg:py-[1vw] pr-4 lg:pr-[1vw]">
                          <div className="flex items-center gap-3 lg:gap-[0.8vw]">
                            <div className="relative w-10 h-10 lg:w-[2.5vw] lg:h-[2.5vw] rounded-xl lg:rounded-[0.6vw] overflow-hidden bg-[#F5ECE8] shrink-0 border border-primary/10">
                              <SmartImage
                                src={order.image}
                                alt={order.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-[#2A170F] block text-xs lg:text-[0.75vw]">
                                {order.id}
                              </span>
                              <span className="text-[11px] lg:text-[0.7vw] text-muted truncate max-w-[180px] lg:max-w-none block">
                                {order.title}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 lg:py-[1vw] text-muted font-medium">
                          {order.date}
                        </td>

                        {/* Items count */}
                        <td className="py-4 lg:py-[1vw] text-center font-bold text-[#2A170F]">
                          {order.itemsCount}
                        </td>

                        {/* Total */}
                        <td className="py-4 lg:py-[1vw] font-bold text-[#2A170F]">
                          {order.total}
                        </td>

                        {/* Status pill */}
                        <td className="py-4 lg:py-[1vw]">
                          <span
                            className={`inline-flex items-center px-2.5 lg:px-[0.6vw] py-1 lg:py-[0.25vw] rounded-full text-[10px] lg:text-[0.65vw] font-bold ${
                              String(order.status).toLowerCase().includes('deliver')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* Details Link */}
                        <td className="py-4 lg:py-[1vw] text-right">
                          <Link
                            href="/orders"
                            className="text-xs lg:text-[0.75vw] font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 lg:gap-[0.3vw] cursor-pointer"
                          >
                            <span>Details</span>
                            <Icon icon="lucide:arrow-right" className="w-3 h-3 lg:w-[0.8vw] lg:h-[0.8vw]" />
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
            <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-7 lg:p-[1.8vw] border border-primary/10 w-full">
              <div className="flex items-center justify-between mb-5 lg:mb-[1.2vw]">
                <h3 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">
                  Wishlist
                </h3>
                <Link
                  href="/wishlist"
                  className="text-xs lg:text-[0.75vw] font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 lg:gap-[0.3vw] cursor-pointer"
                >
                  <span>View All</span>
                  <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
                </Link>
              </div>

              {wishlistPreview.length === 0 ? (
                <div className="py-8 lg:py-[2vw] text-center">
                  <p className="font-heading text-base lg:text-[1.1vw] font-bold text-[#2A170F]">Wishlist is empty</p>
                  <p className="font-secondary text-xs lg:text-[0.75vw] text-body/70 mt-1 mb-4 lg:mb-[1vw]">
                    Save items you love while browsing the shop.
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 lg:gap-[0.4vw] px-5 lg:px-[1.2vw] py-2.5 lg:py-[0.6vw] rounded-full border border-primary/25 text-primary-dark text-xs lg:text-[0.75vw] font-bold"
                  >
                    Browse products
                  </Link>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-[1vw]">
                {wishlistPreview.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 lg:p-[0.9vw] bg-[#FAF6F2] rounded-2xl lg:rounded-[1vw] flex items-center justify-between border border-primary/5 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-3 lg:gap-[0.8vw]">
                      <div className="relative w-12 h-12 lg:w-[3vw] lg:h-[3vw] rounded-xl lg:rounded-[0.8vw] overflow-hidden bg-white shrink-0">
                        <SmartImage
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-xs lg:text-[0.75vw] text-[#2A170F] block">
                          {item.name}
                        </span>
                        <span className="text-[11px] lg:text-[0.7vw] font-semibold text-primary block mt-0.5 lg:mt-[0.1vw]">
                          {item.priceString}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/products/${item.slug}`}
                      className="px-4 lg:px-[1vw] py-1.5 lg:py-[0.4vw] bg-[#7C4831] hover:bg-[#5C321E] text-white text-[11px] lg:text-[0.7vw] font-bold rounded-full transition-colors cursor-pointer shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Complete profile CTA */}
            <div className="bg-[#5C321E] text-white rounded-3xl lg:rounded-[1.8vw] p-6 sm:p-8 lg:p-[2vw] flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-[2vw]">
              <div className="flex items-start gap-4 lg:gap-[1vw]">
                <div className="w-12 h-12 lg:w-[3vw] lg:h-[3vw] rounded-2xl lg:rounded-[1vw] bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                  <Icon icon="ph:user-circle-plus-bold" className="w-6 h-6 lg:w-[1.5vw] lg:h-[1.5vw]" />
                </div>
                <div>
                  <span className="text-[10px] lg:text-[0.65vw] font-bold uppercase tracking-[0.2em] text-amber-200 block">
                    YOUR ACCOUNT
                  </span>
                  <h3 className="font-heading text-2xl lg:text-[1.8vw] font-bold text-white mt-0.5 lg:mt-[0.2vw]">
                    Finish setting up
                  </h3>
                  <p className="text-xs lg:text-[0.75vw] text-white/80 mt-1 lg:mt-[0.3vw] max-w-lg lg:max-w-none leading-relaxed">
                    Add a shipping address and payment method so checkout is faster next time.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 lg:gap-[0.8vw] shrink-0 w-full md:w-auto">
                <Link
                  href="/addresses/new"
                  className="px-6 lg:px-[1.5vw] py-2.5 lg:py-[0.6vw] bg-[#D4A373] hover:bg-[#C28F5F] text-[#3D1E10] font-bold text-xs lg:text-[0.75vw] rounded-full transition-colors text-center"
                >
                  Add address
                </Link>
                <Link
                  href="/settings"
                  className="px-6 lg:px-[1.5vw] py-2.5 lg:py-[0.6vw] bg-white/10 hover:bg-white/20 text-white font-bold text-xs lg:text-[0.75vw] rounded-full transition-colors text-center"
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