'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import { useCart } from '@/shared/context/CartContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import SmartImage from '@/shared/ui/SmartImage';
import {
  ApiError,
  addProductReview,
  cancelMyOrder,
  fetchMyOrders,
  formatMoney,
  type ApiAddress,
  type ApiOrder,
  type ApiProduct,
} from '@/lib/api';
import { getShopFxSettings } from '@/lib/currency';
import { generateSlug, type Product } from '@/shared/data/productData';
import { InvoiceButton, canShowInvoice } from '@/shared/ui/InvoiceViewer';

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  artisan: string;
  location: string;
  qty: number;
  price: number;
  image: string;
  category: string;
}

export interface OrderRecord {
  id: string;
  /** DB line id for GET /order/invoice/:id */
  invoiceLineId: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  placedOn: string;
  shipTo: string;
  total: number;
  status: 'Delivered' | 'In Transit' | 'Cancelled' | string;
  /** True while still Pending / pre-shipping — customer may cancel */
  canCancel: boolean;
  tracking: string;
  deliveryDate?: string;
  estDelivery?: string;
  items: OrderItem[];
}

type ReviewTarget = {
  productId: string;
  title: string;
  image: string;
};

type TrackTarget = {
  orderId: string;
  tracking: string;
  status: string;
  deliveryStatus?: string;
  placedOn: string;
  shipTo: string;
  estDelivery?: string;
  deliveryDate?: string;
};

const TRACK_STEPS = [
  { key: 'pending', label: 'Order placed', match: /pending|processing|placed|confirmed/i },
  { key: 'packed', label: 'Packed', match: /pack|ready|prepar/i },
  { key: 'shipped', label: 'Shipped', match: /ship|transit|dispatch|progress/i },
  { key: 'out', label: 'Out for delivery', match: /out.?for|courier/i },
  { key: 'delivered', label: 'Delivered', match: /deliver/i },
] as const;

function resolveProductImage(product: {
  image?: unknown;
  image_url?: string | null;
  name?: string;
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
  return raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/i, '') || raw;
}

function parseMoreDetails(product: ApiProduct | null): Record<string, unknown> {
  if (!product?.more_details) return {};
  if (typeof product.more_details === 'string') {
    try {
      return JSON.parse(product.more_details || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return product.more_details;
}

function formatShipTo(addr: ApiAddress | Record<string, unknown> | null | undefined): string {
  if (!addr || typeof addr !== 'object') return '—';
  const city = String((addr as ApiAddress).city || '').trim();
  const state = String((addr as ApiAddress).state || '').trim();
  const country = String((addr as ApiAddress).country || '').trim();
  const parts = [city, state, country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  const line = String((addr as ApiAddress).address_line || '').trim();
  return line || '—';
}

function activeTrackIndex(status: string, deliveryStatus?: string): number {
  const raw = `${deliveryStatus || ''} ${status || ''}`;
  if (/cancel/i.test(raw)) return -1;
  if (/deliver/i.test(raw)) return TRACK_STEPS.length - 1;
  for (let i = TRACK_STEPS.length - 1; i >= 0; i -= 1) {
    if (TRACK_STEPS[i].match.test(raw)) return i;
  }
  return 0;
}

/** Match backend: cancel blocked once shipped / out for delivery / delivered / returned / cancelled. */
function isPastCancelWindow(status?: string): boolean {
  const s = String(status || '').toLowerCase().trim();
  if (!s) return false;
  return /ship|out.?for|transit|deliver|dispatch|return|cancel/i.test(s);
}

function mapApiOrders(rows: ApiOrder[]): OrderRecord[] {
  const byGroup = new Map<string, OrderRecord>();

  for (const o of rows) {
    const product =
      (typeof o.productId === 'object' && o.productId) || o.product_details || null;
    const details = parseMoreDetails(product);
    const image = resolveProductImage(product);
    const title = product?.name || 'Order item';
    const productId = String(
      (product && (product.id ?? product._id)) ||
        (typeof o.productId === 'number' ? o.productId : '') ||
        '',
    );
    const slug =
      (typeof details.slug === 'string' && details.slug) ||
      generateSlug(title) ||
      productId;
    const artisan =
      (details.artisan as { name?: string } | undefined)?.name ||
      (typeof details.artisanName === 'string' ? details.artisanName : '') ||
      'Artisan';
    const location =
      (typeof details.location === 'string' && details.location) || 'Nepal';
    const category =
      product?.category?.[0]?.name ||
      (typeof details.category === 'string' ? details.category : '') ||
      'Handicraft';

    const rawStatus = String(o.delivery_status || o.payment_status || 'Processing');
    const status = /deliver/i.test(rawStatus)
      ? 'Delivered'
      : /cancel/i.test(rawStatus)
        ? 'Cancelled'
        : /transit|ship|progress|dispatch|out.?for/i.test(rawStatus)
          ? 'In Transit'
          : rawStatus;
    const groupId = String(o.orderId || o.id || o._id || '');
    const lineId = String(o.id ?? o._id ?? '');
    const tracking = groupId ? `MTN-${groupId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase() || groupId}` : '—';

    const item: OrderItem = {
      id: lineId || title,
      productId,
      slug,
      title,
      artisan,
      location,
      qty: Number(o.quantity ?? 1),
      price: Number(o.unitPrice ?? o.lineTotal ?? 0),
      image: String(image),
      category,
    };

    const existing = byGroup.get(groupId);
    if (!existing) {
      byGroup.set(groupId, {
        id: groupId,
        invoiceLineId: lineId,
        paymentStatus: o.payment_status,
        deliveryStatus: o.delivery_status,
        placedOn: o.createdAt
          ? new Date(o.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '—',
        shipTo: formatShipTo(o.delivery_address),
        total: Number(o.totalAmt ?? o.lineTotal ?? o.subTotalAmt ?? 0),
        status,
        canCancel: !isPastCancelWindow(o.delivery_status),
        tracking,
        deliveryDate: status === 'Delivered' && o.createdAt
          ? new Date(o.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : undefined,
        estDelivery:
          status === 'In Transit'
            ? 'Usually 5–10 business days after ship'
            : undefined,
        items: [item],
      });
    } else {
      existing.items.push(item);
      existing.total = Math.max(existing.total, Number(o.totalAmt ?? 0));
      if (!existing.invoiceLineId && lineId) existing.invoiceLineId = lineId;
      if (!existing.paymentStatus && o.payment_status) existing.paymentStatus = o.payment_status;
      if (!existing.deliveryStatus && o.delivery_status) {
        existing.deliveryStatus = o.delivery_status;
      }
      if (existing.shipTo === '—' && o.delivery_address) {
        existing.shipTo = formatShipTo(o.delivery_address);
      }
      if (isPastCancelWindow(o.delivery_status)) existing.canCancel = false;
      if (/cancel/i.test(String(o.delivery_status || ''))) {
        existing.status = 'Cancelled';
        existing.canCancel = false;
      }
    }
  }

  return Array.from(byGroup.values());
}

function itemToProduct(item: OrderItem): Product {
  return {
    id: item.productId || item.id,
    name: item.title,
    slug: item.slug,
    category: item.category,
    location: item.location,
    price: formatMoney(item.price, getShopFxSettings().currency || 'USD'),
    image: item.image,
    subtitle: '',
    description: '',
    originalPrice: '',
    discount: '',
    medium: '',
    dimensions: '',
    age: '',
    school: '',
    stock: 99,
    galleryImages: [item.image],
    tags: [],
    artisan: {
      name: item.artisan,
      bio: [],
      image: item.image,
      stats: { yearsOfCraft: 0, itemsCreated: 0, apprentices: 0 },
    },
  };
}

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();
  const currency = getShopFxSettings().currency || 'USD';

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'In Transit' | 'Delivered' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState('');
  const [notificationTone, setNotificationTone] = useState<'ok' | 'err'>('ok');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewOk, setReviewOk] = useState('');

  const [trackTarget, setTrackTarget] = useState<TrackTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchMyOrders();
        if (!cancelled) setOrders(mapApiOrders(rows));
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length, inTransit: 0, delivered: 0, cancelled: 0 };
    for (const order of orders) {
      if (order.status === 'In Transit') counts.inTransit += 1;
      else if (order.status === 'Delivered') counts.delivered += 1;
      else if (order.status === 'Cancelled') counts.cancelled += 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesFilter = activeFilter === 'All' || order.status === activeFilter;
        const matchesSearch =
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.tracking.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.items.some(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.artisan.toLowerCase().includes(searchQuery.toLowerCase()),
          );
        return matchesFilter && matchesSearch;
      }),
    [orders, activeFilter, searchQuery],
  );

  const showToast = (message: string, tone: 'ok' | 'err' = 'ok') => {
    setNotificationTone(tone);
    setNotification(message);
    window.setTimeout(() => setNotification(''), 3500);
  };

  const reloadOrders = async () => {
    const rows = await fetchMyOrders();
    setOrders(mapApiOrders(rows));
  };

  const handleCancelOrder = async (order: OrderRecord) => {
    if (!order.canCancel || cancellingId) return;
    const ok = window.confirm(
      `Cancel order ${order.id}? Paid orders are refunded automatically when possible.`,
    );
    if (!ok) return;

    setCancellingId(order.id);
    try {
      await cancelMyOrder(order.id);
      await reloadOrders();
      showToast('Order cancelled successfully.');
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not cancel this order.',
        'err',
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleReorder = (item: OrderItem) => {
    if (!item.productId && !item.slug) {
      showToast('This item is no longer available to reorder.');
      return;
    }
    addToCart(itemToProduct(item), item.qty || 1);
    showToast(`“${item.title}” added to your cart.`);
  };

  const openReview = (item: OrderItem) => {
    if (!item.productId) {
      if (item.slug) {
        router.push(`/products/${item.slug}#reviews`);
        return;
      }
      showToast('Product not found for review.');
      return;
    }
    setReviewTarget({
      productId: item.productId,
      title: item.title,
      image: item.image,
    });
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setReviewOk('');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewBusy(true);
    setReviewError('');
    setReviewOk('');
    try {
      await addProductReview({
        productId: reviewTarget.productId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewOk('Thanks — your review was posted.');
      showToast(`Review submitted for “${reviewTarget.title}”.`);
      window.setTimeout(() => setReviewTarget(null), 900);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setReviewError('Sign in again to leave a review.');
      } else {
        setReviewError(err instanceof Error ? err.message : 'Could not submit review');
      }
    } finally {
      setReviewBusy(false);
    }
  };

  const openTrack = (order: OrderRecord) => {
    setTrackTarget({
      orderId: order.id,
      tracking: order.tracking,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      placedOn: order.placedOn,
      shipTo: order.shipTo,
      estDelivery: order.estDelivery,
      deliveryDate: order.deliveryDate,
    });
  };

  if (!user) {
    return null;
  }

  const trackStep = trackTarget
    ? activeTrackIndex(trackTarget.status, trackTarget.deliveryStatus)
    : 0;
  const trackCancelled = trackTarget
    ? /cancel/i.test(`${trackTarget.status} ${trackTarget.deliveryStatus || ''}`)
    : false;

  return (
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          
          <ProfileSidebar active="orders" />

          {/* RIGHT MAIN CONTENT */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 lg:gap-[1.5vw]">
            
            {/* Header & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-[1vw]">
              <div>
                <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                  ACCOUNT
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                  My Orders
                </h1>
                <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                  {loading
                    ? 'Loading your orders…'
                    : statusCounts.all === 0
                      ? 'No orders yet'
                      : `${statusCounts.all} order${statusCounts.all === 1 ? '' : 's'} placed`}
                </p>
              </div>

              {/* Search Orders Pill */}
              <div className="relative w-full md:w-64 lg:w-[16vw]">
                <Icon
                  icon="lucide:search"
                  className="absolute left-3.5 lg:left-[0.8vw] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-muted"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full pl-9 lg:pl-[2.2vw] pr-4 lg:pr-[1vw] py-2.5 lg:py-[0.6vw] bg-white border border-primary/15 rounded-full text-xs lg:text-[0.75vw] text-[#2A170F] placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Notification Toast */}
            {notification && (
              <div
                className={`p-3 text-xs rounded-2xl flex items-center justify-between animate-fade-in border ${
                  notificationTone === 'err'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    icon={notificationTone === 'err' ? 'lucide:alert-circle' : 'lucide:check-circle'}
                    className={`w-4 h-4 ${notificationTone === 'err' ? 'text-red-600' : 'text-emerald-600'}`}
                  />
                  <span>{notification}</span>
                </div>
                {notificationTone === 'ok' && /cart/i.test(notification) && (
                  <Link href="/cart" className="font-bold underline text-emerald-900">
                    View Cart
                  </Link>
                )}
              </div>
            )}

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center gap-2.5 py-1">
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFilter === 'All'
                    ? 'bg-[#7C4831] text-white shadow-xs'
                    : 'bg-white text-[#664132] border border-primary/10 hover:bg-gray-50'
                }`}
              >
                <span>All Orders</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeFilter === 'All' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#664132]'
                  }`}
                >
                  {statusCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('In Transit')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFilter === 'In Transit'
                    ? 'bg-[#7C4831] text-white shadow-xs'
                    : 'bg-white text-[#664132] border border-primary/10 hover:bg-gray-50'
                }`}
              >
                <span>In Transit</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeFilter === 'In Transit' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#664132]'
                  }`}
                >
                  {statusCounts.inTransit}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('Delivered')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFilter === 'Delivered'
                    ? 'bg-[#7C4831] text-white shadow-xs'
                    : 'bg-white text-[#664132] border border-primary/10 hover:bg-gray-50'
                }`}
              >
                <span>Delivered</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeFilter === 'Delivered' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#664132]'
                  }`}
                >
                  {statusCounts.delivered}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('Cancelled')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFilter === 'Cancelled'
                    ? 'bg-[#7C4831] text-white shadow-xs'
                    : 'bg-white text-[#664132] border border-primary/10 hover:bg-gray-50'
                }`}
              >
                <span>Cancelled</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeFilter === 'Cancelled' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#664132]'
                  }`}
                >
                  {statusCounts.cancelled}
                </span>
              </button>
            </div>

            {/* Orders Cards List */}
            {loading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-primary/10">
                <p className="text-xs text-muted">Loading orders…</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-primary/10">
                <Icon icon="ph:package-light" className="w-12 h-12 text-muted mx-auto mb-3" />
                <h3 className="font-heading text-lg font-bold text-[#2A170F] mb-1">
                  No orders found
                </h3>
                <p className="text-xs text-muted">
                  You haven&apos;t placed any orders yet. Start shopping to see them here.
                </p>
                <Link
                  href="/products"
                  className="inline-flex mt-4 px-5 py-2.5 rounded-full bg-[#7C4831] text-white text-xs font-bold"
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-primary/10 overflow-hidden shadow-xs"
                  >
                    {/* Card Top Details Header */}
                    <div className="p-5 sm:p-6 bg-[#FAF6F2]/50 border-b border-primary/5 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold block">
                            Order ID
                          </span>
                          <span className="font-bold text-[#2A170F] text-sm font-heading">
                            {order.id}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold block">
                            Placed on
                          </span>
                          <span className="font-bold text-[#2A170F] mt-0.5 block">
                            {order.placedOn}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold block">
                            Ship to
                          </span>
                          <span className="font-bold text-[#2A170F] mt-0.5 block">
                            {order.shipTo}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold block">
                            Order Total
                          </span>
                          <span className="font-bold text-[#2A170F] text-sm block">
                            {formatMoney(order.total, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge & View Invoice Button */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'In Transit'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : order.status === 'Cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {order.status === 'Delivered' && (
                            <Icon icon="lucide:check-circle-2" className="w-3 h-3 mr-1 text-emerald-600" />
                          )}
                          {order.status === 'In Transit' && (
                            <Icon icon="lucide:truck" className="w-3 h-3 mr-1 text-amber-600" />
                          )}
                          {order.status}
                        </span>

                        {canShowInvoice(order.paymentStatus, order.deliveryStatus) ? (
                          <InvoiceButton
                            orderLineId={order.invoiceLineId || order.id}
                            orderId={order.id}
                            paymentStatus={order.paymentStatus}
                            deliveryStatus={order.deliveryStatus}
                            label="View Invoice"
                            className="px-3.5 py-1.5 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1 cursor-pointer"
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* Order Items Section */}
                    <div className="p-5 sm:p-6 flex flex-col gap-5 divide-y divide-gray-100">
                      {order.items.map((item, index) => (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            index > 0 ? 'pt-5' : ''
                          }`}
                        >
                          {/* Left Item Details */}
                          <div className="flex items-center gap-4">
                            <Link
                              href={item.slug ? `/products/${item.slug}` : '/products'}
                              className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#FAF6F2] border border-primary/10 shrink-0"
                            >
                              <SmartImage
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            </Link>
                            <div>
                              <Link
                                href={item.slug ? `/products/${item.slug}` : '/products'}
                                className="font-heading text-sm font-bold text-[#2A170F] hover:text-primary transition-colors"
                              >
                                {item.title}
                              </Link>
                              <p className="text-xs text-muted font-medium mt-0.5">
                                By {item.artisan}, {item.location}
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-700 rounded-md">
                                Qty: {item.qty}
                              </span>
                            </div>
                          </div>

                          {/* Right Item Price & Action Buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                            <span className="font-bold text-base text-[#2A170F] font-heading">
                              {formatMoney(item.price, currency)}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReorder(item)}
                                className="px-3.5 py-1.5 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Icon icon="ph:arrows-counter-clockwise-bold" className="w-3.5 h-3.5 text-primary" />
                                <span>Reorder</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openReview(item)}
                                className="px-3.5 py-1.5 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Icon icon="ph:star-bold" className="w-3.5 h-3.5 text-amber-500" />
                                <span>Review</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer Tracking Row */}
                    <div className="px-5 sm:px-6 py-3.5 bg-[#FAF6F2]/60 border-t border-primary/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Icon icon="ph:truck-bold" className="w-4 h-4 text-primary" />
                          <span>Tracking:</span>
                          <span className="font-bold text-[#2A170F]">{order.tracking || '—'}</span>
                        </div>

                        {order.deliveryDate && (
                          <div className="flex items-center gap-1.5">
                            <Icon icon="ph:calendar-check-bold" className="w-4 h-4 text-emerald-600" />
                            <span>Delivered:</span>
                            <span className="font-bold text-[#2A170F]">{order.deliveryDate}</span>
                          </div>
                        )}

                        {order.estDelivery && (
                          <div className="flex items-center gap-1.5">
                            <Icon icon="ph:clock-bold" className="w-4 h-4 text-amber-600" />
                            <span>Est. Delivery:</span>
                            <span className="font-bold text-[#2A170F]">{order.estDelivery}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 font-semibold text-[11px] text-muted">
                        {order.canCancel && (
                          <button
                            type="button"
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancelOrder(order)}
                            className="hover:text-red-700 text-red-600/90 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            <Icon icon="ph:x-circle-bold" className="w-3.5 h-3.5" />
                            <span>
                              {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openTrack(order)}
                          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Icon icon="ph:map-pin-line-bold" className="w-3.5 h-3.5" />
                          <span>Track Package</span>
                        </button>
                        <Link
                          href={`/contact?order=${encodeURIComponent(order.id)}`}
                          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Icon icon="ph:question-bold" className="w-3.5 h-3.5" />
                          <span>Need Help?</span>
                        </Link>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Review modal */}
      {reviewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => !reviewBusy && setReviewTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl border border-primary/10 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FAF6F2] border border-primary/10 shrink-0">
                <SmartImage
                  src={reviewTarget.image}
                  alt={reviewTarget.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="review-modal-title" className="font-heading text-lg font-bold text-[#2A170F]">
                  Write a review
                </h2>
                <p className="text-xs text-muted truncate mt-0.5">{reviewTarget.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={reviewBusy}
                onClick={() => setReviewTarget(null)}
                className="text-muted hover:text-[#2A170F] cursor-pointer"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitReview} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Rating
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      className="text-amber-500 p-0.5 cursor-pointer"
                      aria-label={`${n} stars`}
                    >
                      <Icon
                        icon={n <= reviewRating ? 'ph:star-fill' : 'ph:star'}
                        className="w-5 h-5"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                placeholder="Share details about quality, craftsmanship, shipping…"
                className="w-full rounded-2xl border border-primary/20 bg-[#FAF6F2]/40 px-4 py-3 text-sm text-[#2A170F] placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {reviewError ? (
                <p className="text-xs text-red-700">{reviewError}</p>
              ) : null}
              {reviewOk ? (
                <p className="text-xs text-emerald-700">{reviewOk}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => setReviewTarget(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#E2D5C7] text-xs font-bold text-[#2A170F] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewBusy}
                  className="flex-1 py-2.5 rounded-full bg-[#7C4831] text-white text-xs font-bold hover:bg-[#5C321E] disabled:opacity-60 cursor-pointer"
                >
                  {reviewBusy ? 'Posting…' : 'Post review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Track package modal */}
      {trackTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-modal-title"
          onClick={() => setTrackTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl border border-primary/10 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 id="track-modal-title" className="font-heading text-lg font-bold text-[#2A170F]">
                  Track package
                </h2>
                <p className="text-xs text-muted mt-0.5">Order {trackTarget.orderId}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setTrackTarget(null)}
                className="text-muted hover:text-[#2A170F] cursor-pointer"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#FAF6F2] border border-primary/10 p-4 mb-5 text-xs space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Tracking #</span>
                <span className="font-bold text-[#2A170F]">{trackTarget.tracking}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Status</span>
                <span className="font-bold text-[#2A170F] capitalize">
                  {trackTarget.status}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Ship to</span>
                <span className="font-bold text-[#2A170F] text-right">{trackTarget.shipTo}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Placed</span>
                <span className="font-bold text-[#2A170F]">{trackTarget.placedOn}</span>
              </div>
              {trackTarget.deliveryDate ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Delivered</span>
                  <span className="font-bold text-[#2A170F]">{trackTarget.deliveryDate}</span>
                </div>
              ) : null}
              {trackTarget.estDelivery ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Est. delivery</span>
                  <span className="font-bold text-[#2A170F] text-right">{trackTarget.estDelivery}</span>
                </div>
              ) : null}
            </div>

            {trackCancelled ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                This order was cancelled. Contact support if you need a refund or replacement.
              </p>
            ) : (
              <ol className="flex flex-col gap-0">
                {TRACK_STEPS.map((step, index) => {
                  const done = index <= trackStep;
                  const current = index === trackStep;
                  const isLast = index === TRACK_STEPS.length - 1;
                  return (
                    <li key={step.key} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center w-4 shrink-0">
                        <span
                          className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                            done
                              ? 'bg-[#7C4831] border-[#7C4831]'
                              : 'bg-white border-[#D4C4B5]'
                          }`}
                        />
                        {!isLast ? (
                          <span
                            className={`w-px flex-1 min-h-[1.25rem] my-1 ${
                              index < trackStep ? 'bg-[#7C4831]' : 'bg-[#E2D5C7]'
                            }`}
                          />
                        ) : null}
                      </div>
                      <div className={`flex items-center gap-2 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                        <p
                          className={`text-sm font-semibold leading-none ${
                            done ? 'text-[#2A170F]' : 'text-muted'
                          }`}
                        >
                          {step.label}
                        </p>
                        {current ? (
                          <span className="text-[10px] uppercase tracking-wider text-primary font-bold shrink-0">
                            Current
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-6 flex gap-2">
              <Link
                href={`/contact?order=${encodeURIComponent(trackTarget.orderId)}`}
                className="flex-1 text-center py-2.5 rounded-full border border-[#E2D5C7] text-xs font-bold text-[#2A170F] hover:bg-gray-50"
              >
                Need help?
              </Link>
              <button
                type="button"
                onClick={() => setTrackTarget(null)}
                className="flex-1 py-2.5 rounded-full bg-[#7C4831] text-white text-xs font-bold hover:bg-[#5C321E] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Orders;
