/**
 * API helpers for the Matina Crafts storefront.
 * Products are public. Cart / wishlist / checkout / orders need a session cookie
 * (login later). Guests keep working via localStorage in the contexts.
 */

import { toDisplayAmount, getShopFxSettings } from '@/lib/currency';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export type ApiProduct = {
  id: number;
  _id?: number;
  name: string;
  description?: string;
  price: string | number;
  stock?: number;
  unit?: string;
  discount?: string | number;
  publish?: boolean;
  image?: string[];
  image_url?: string | null;
  category?: Array<{ id: number; name: string }>;
  subcategory?: Array<{ id: number; name: string }>;
  category_id?: number | null;
  subcategory_id?: number | null;
  more_details?: Record<string, unknown> | string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCoupon = {
  id?: number;
  _id?: number;
  code: string;
  discount_type: 'percent' | 'fixed' | string;
  discount_value: number | string;
  min_order_amt?: number | string;
  max_uses?: number | null;
  used_count?: number;
  expires_at?: string | null;
  active?: boolean;
};

export type ApiAddress = {
  id: number;
  _id?: number;
  address_line: string;
  city: string;
  state?: string;
  pincode?: string;
  country: string;
  mobile?: string;
};

export type ApiCartLine = {
  id: number;
  _id?: number;
  product_id: number;
  quantity: number;
  productId?: ApiProduct | number;
};

export type ApiWishlistLine = {
  id: number;
  _id?: number;
  product_id: number;
  product?: ApiProduct;
};

export type CheckoutPreview = {
  subtotal: number;
  couponDiscount: number;
  couponCode: string | null;
  afterCoupon: number;
  taxAmt: number;
  shippingAmt: number;
  totalAmt: number;
  lines: Array<{
    productId: number | string;
    product?: ApiProduct;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  currency?: string;
};

export type ApiOrder = {
  id: number;
  _id?: number;
  orderId?: string;
  productId?: number | ApiProduct;
  product_details?: ApiProduct;
  payment_status?: string;
  delivery_status?: string;
  quantity?: number;
  unitPrice?: number | string;
  lineTotal?: number | string;
  subTotalAmt?: number | string;
  totalAmt?: number | string;
  taxAmt?: number | string;
  shippingAmt?: number | string;
  couponCode?: string | null;
  couponDiscount?: number | string;
  delivery_address?: ApiAddress | Record<string, unknown>;
  createdAt?: string;
  invoiceReceipt?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

type Envelope<T> = {
  success?: boolean;
  error?: boolean;
  message?: string;
  data?: T;
  pricing?: CheckoutPreview;
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let refreshPromise: Promise<boolean> | null = null;

function isAuthBootstrapPath(path: string): boolean {
  return (
    path.includes('/user/login') ||
    path.includes('/user/refresh-token') ||
    path.includes('/user/logout') ||
    path.includes('/user/google') ||
    path.includes('/user/login-pin') ||
    path.includes('/user/register')
  );
}

/** Single-flight refresh so parallel 401s (and multi-tab races) share one rotate. */
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_URL}/user/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      return res.ok;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown; _retry?: boolean } = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCookie('csrfToken');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    cache: 'no-store',
  });

  if (res.status === 401 && !options._retry && !isAuthBootstrapPath(path)) {
    const ok = await refreshSession();
    if (ok) {
      return apiFetch<T>(path, { ...options, _retry: true });
    }
  }

  let json: Envelope<T> = {};
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* empty */
  }

  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  }

  return (json.data as T) ?? (json as unknown as T);
}

/** True when a customer session cookie works. */
export async function hasSession(): Promise<boolean> {
  try {
    await apiFetch<unknown>('/user/user-details');
    return true;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return false;
    }
    return false;
  }
}

export type ApiUserProfile = {
  id?: number | string;
  _id?: number | string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  bio?: string;
  avatar?: string | null;
};

export async function fetchUserProfile(): Promise<ApiUserProfile> {
  return apiFetch<ApiUserProfile>('/user/user-details');
}

export function computeCouponDiscount(subtotal: number, coupon: ApiCoupon | null): number {
  if (!coupon) return 0;
  const min = Number(coupon.min_order_amt) || 0;
  if (subtotal < min) {
    throw new Error(`Minimum order ${min.toLocaleString()} required for this coupon`);
  }
  if (coupon.discount_type === 'percent') {
    return Number(((subtotal * Number(coupon.discount_value)) / 100).toFixed(2));
  }
  return Math.min(subtotal, Number(coupon.discount_value));
}

// ─── Products ───────────────────────────────────────────────

type ProductsResponse = {
  success: boolean;
  message?: string;
  data: ApiProduct[];
  totalCount?: number;
};

type ProductResponse = {
  success: boolean;
  message?: string;
  data: ApiProduct;
};

export async function fetchProducts(limit = 50): Promise<ApiProduct[]> {
  const res = await fetch(`${API_URL}/product/get-product?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  const json = (await res.json()) as ProductsResponse;
  if (!json.success) throw new Error(json.message || 'Failed to load products');
  return json.data ?? [];
}

export async function fetchProductById(id: string | number): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/product/get-product/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'Product not found' : `Failed to load product (${res.status})`);
  }
  const json = (await res.json()) as ProductResponse;
  if (!json.success || !json.data) throw new Error(json.message || 'Product not found');
  return json.data;
}

export async function fetchProductBySlug(slug: string): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/product/by-slug/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'Product not found' : `Failed to load product (${res.status})`);
  }
  const json = (await res.json()) as ProductResponse;
  if (!json.success || !json.data) throw new Error(json.message || 'Product not found');
  return json.data;
}

export type ShopSettings = {
  currency?: string;
  region_mode?: string;
  price_base_currency?: string;
  usd_npr_rate?: number;
  tax_percent?: number;
  tax_region?: string;
  admin_timezone?: string;
  flat_shipping_fee?: number;
  free_shipping_min?: number;
  [key: string]: unknown;
};

export async function fetchShopSettings(): Promise<ShopSettings> {
  return (await apiFetch<ShopSettings>('/shop/settings')) ?? {};
}

/** Format money using shop currency (defaults to USD for USA store). */
export function formatMoney(amount: number, currency = 'USD'): string {
  const code = String(currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(code === 'NPR' ? 'en-NP' : 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${code} ${(Number(amount) || 0).toLocaleString()}`;
  }
}

/** @deprecated use formatMoney — kept as alias for gradual migration */
export function formatNPR(amount: number): string {
  return formatMoney(amount, 'USD');
}

export type GoogleReview = {
  id: number;
  name: string;
  role: string;
  text: string;
  rating: number;
  initials: string;
  color: string;
  columnIndex: number;
};

/** Public homepage Google / customer reviews (admin-selected visible ones). */
export async function fetchGoogleReviews(): Promise<GoogleReview[]> {
  const rows = (await apiFetch<GoogleReview[]>('/google-reviews')) ?? [];
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name || '',
    role: r.role || '',
    text: r.text || '',
    rating: Number(r.rating) || 5,
    initials: r.initials || (r.name || '?').slice(0, 2).toUpperCase(),
    color: r.color || '#8C523A',
    columnIndex: Number(r.columnIndex ?? 0),
  }));
}

export type ApiReview = {
  id: number;
  _id?: number;
  productId?: number;
  product_id?: number;
  userId?: number;
  rating: number;
  comment?: string;
  userName?: string;
  createdAt?: string;
  created_at?: string;
};

export type ReviewSummary = {
  count: number;
  avg: number;
};

export async function fetchProductReviews(
  productId: string | number,
): Promise<{ reviews: ApiReview[]; summary: ReviewSummary }> {
  const res = await fetch(`${API_URL}/review/product/${productId}`, { cache: 'no-store' });
  const json = (await res.json()) as Envelope<ApiReview[]> & {
    summary?: ReviewSummary;
    message?: string;
  };
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Failed to load reviews (${res.status})`, res.status);
  }
  return {
    reviews: json.data ?? [],
    summary: {
      count: Number(json.summary?.count ?? 0),
      avg: Number(json.summary?.avg ?? 0),
    },
  };
}

export async function addProductReview(opts: {
  productId: string | number;
  rating: number;
  comment?: string;
}): Promise<ApiReview> {
  return apiFetch<ApiReview>('/review/add', {
    method: 'POST',
    json: {
      productId: opts.productId,
      rating: opts.rating,
      comment: opts.comment ?? '',
    },
  });
}

export async function submitFeedback(opts: {
  targetType: 'product' | 'seller' | 'business';
  comment: string;
  title?: string;
  rating?: number;
  productId?: string | number;
  sellerId?: string | number;
}): Promise<unknown> {
  return apiFetch('/feedback/submit', {
    method: 'POST',
    json: opts,
  });
}

export type ApiReturn = {
  id: number;
  _id?: number;
  order_row_id?: number;
  orderRowId?: number;
  reason?: string;
  status?: string;
  admin_note?: string;
  createdAt?: string;
  created_at?: string;
};

export async function fetchMyReturns(): Promise<ApiReturn[]> {
  return (await apiFetch<ApiReturn[]>('/return/my')) ?? [];
}

export async function requestReturn(opts: {
  orderRowId: string | number;
  reason: string;
}): Promise<ApiReturn> {
  return apiFetch<ApiReturn>('/return/request', {
    method: 'POST',
    json: {
      orderRowId: opts.orderRowId,
      reason: opts.reason,
    },
  });
}

export async function confirmOnlineOrder(sessionId: string): Promise<ApiOrder[]> {
  const data = await apiFetch<ApiOrder[]>('/order/confirm-online', {
    method: 'POST',
    json: { sessionId },
  });
  return data ?? [];
}

// ─── Coupon (public) ────────────────────────────────────────

export async function validateCoupon(code: string): Promise<ApiCoupon> {
  return apiFetch<ApiCoupon>('/coupon/validate', {
    method: 'POST',
    json: { code: code.trim() },
  });
}

// ─── Cart (auth) ────────────────────────────────────────────

export async function fetchServerCart(): Promise<ApiCartLine[]> {
  return (await apiFetch<ApiCartLine[]>('/cart/get')) ?? [];
}

export async function addServerCartItem(productId: string | number, quantity = 1) {
  return apiFetch('/cart/add', {
    method: 'POST',
    json: { productId, quantity },
  });
}

export async function updateServerCartItem(cartLineId: string | number, quantity: number) {
  return apiFetch('/cart/update', {
    method: 'PUT',
    json: { _id: cartLineId, quantity },
  });
}

export async function removeServerCartItem(cartLineId: string | number) {
  return apiFetch('/cart/delete', {
    method: 'DELETE',
    json: { _id: cartLineId },
  });
}

/** Explicit cart/checkout abandonment beacon (metrics). Fire-and-forget safe. */
export async function reportCartAbandon(reason: string): Promise<void> {
  try {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const csrf = getCookie('csrfToken');
    if (csrf) headers.set('X-CSRF-Token', csrf);
    await fetch(`${API_URL}/cart/abandon`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ reason }),
      cache: 'no-store',
      keepalive: true,
    });
  } catch {
    /* never block UX on analytics */
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function productBasics(raw: ApiProduct | null | undefined, fallbackId: string | number) {
  const details =
    typeof raw?.more_details === 'string'
      ? (JSON.parse(raw.more_details || '{}') as Record<string, unknown>)
      : ((raw?.more_details as Record<string, unknown>) ?? {});
  const name = raw?.name?.trim() || 'Product';
  const id = String(raw?.id ?? raw?._id ?? fallbackId);
  const images = Array.isArray(raw?.image) ? raw.image.filter(Boolean) : [];
  const image = images[0] || raw?.image_url || '';
  const basePrice = Number(raw?.price ?? 0);
  const fx = getShopFxSettings();
  const priceNum = toDisplayAmount(basePrice, fx);
  const currency = fx.currency || 'USD';
  const slug =
    (typeof details.slug === 'string' && details.slug) || slugify(name) || id;

  return {
    id,
    name,
    slug,
    category: raw?.category?.[0]?.name ?? 'Handicraft',
    artisanName:
      (details.artisan as { name?: string } | undefined)?.name || 'Artisan',
    artisanLocation: (typeof details.location === 'string' && details.location) || 'Nepal',
    price: priceNum,
    priceString: formatMoney(priceNum, currency),
    originalPrice: typeof details.originalPrice === 'string' ? details.originalPrice : undefined,
    discountBadge:
      Number(raw?.discount ?? 0) > 0 ? `${Number(raw?.discount)}% OFF` : undefined,
    image: typeof image === 'string' ? image : '',
    stock: Number(raw?.stock ?? 0),
  };
}

export function cartLineToLocal(line: ApiCartLine) {
  const raw =
    typeof line.productId === 'object' && line.productId ? line.productId : null;
  const basics = productBasics(raw, line.product_id);
  return {
    id: basics.id,
    cartLineId: String(line.id ?? line._id),
    name: basics.name,
    slug: basics.slug,
    category: basics.category,
    artisanName: basics.artisanName,
    artisanLocation: basics.artisanLocation,
    price: basics.price,
    priceString: basics.priceString,
    originalPrice: basics.originalPrice,
    image: basics.image,
    quantity: Number(line.quantity) || 1,
    rating: 5,
  };
}

// ─── Wishlist (auth) ────────────────────────────────────────

export async function fetchServerWishlist(): Promise<ApiWishlistLine[]> {
  return (await apiFetch<ApiWishlistLine[]>('/wishlist')) ?? [];
}

export async function addServerWishlistItem(productId: string | number) {
  return apiFetch('/wishlist/add', {
    method: 'POST',
    json: { productId },
  });
}

export async function removeServerWishlistItem(productId: string | number) {
  return apiFetch('/wishlist/remove', {
    method: 'DELETE',
    json: { productId },
  });
}

export function wishlistLineToLocal(line: ApiWishlistLine) {
  const basics = productBasics(line.product, line.product_id);
  return {
    id: basics.id,
    name: basics.name,
    slug: basics.slug,
    category: basics.category,
    artisanName: basics.artisanName,
    artisanLocation: basics.artisanLocation,
    price: basics.price,
    priceString: basics.priceString,
    originalPrice: basics.originalPrice,
    discountBadge: basics.discountBadge,
    image: basics.image,
    rating: 5,
    reviewsCount: 0,
    inStock: basics.stock > 0,
    onSale: Boolean(basics.discountBadge),
  };
}

// ─── Address (auth) ─────────────────────────────────────────

export async function fetchAddresses(): Promise<ApiAddress[]> {
  return (await apiFetch<ApiAddress[]>('/address/get')) ?? [];
}

export async function createAddress(body: {
  address_line: string;
  city: string;
  state?: string;
  pincode?: string;
  country: string;
  mobile?: string;
}): Promise<ApiAddress> {
  return apiFetch<ApiAddress>('/address/add', { method: 'POST', json: body });
}

// ─── Orders / checkout (auth) ───────────────────────────────

export type CheckoutItem = { productId: string | number; quantity: number };

export async function previewCheckout(opts: {
  couponCode?: string;
  list_items: CheckoutItem[];
}): Promise<CheckoutPreview> {
  return apiFetch<CheckoutPreview>('/order/preview-checkout', {
    method: 'POST',
    json: {
      couponCode: opts.couponCode || undefined,
      useCart: false,
      list_items: opts.list_items,
    },
  });
}

export async function placeCodOrder(opts: {
  addressId: string | number;
  couponCode?: string;
  list_items: CheckoutItem[];
  /** Stable key for this attempt — required by API; reuse on retries of the same click */
  idempotencyKey?: string;
}): Promise<{ orders: ApiOrder[]; pricing?: CheckoutPreview }> {
  const idempotencyKey =
    opts.idempotencyKey ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? `cod-${crypto.randomUUID()}`
      : `cod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const res = await fetch(`${API_URL}/order/place-cod`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCookie('csrfToken') ? { 'X-CSRF-Token': getCookie('csrfToken')! } : {}),
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      addressId: opts.addressId,
      couponCode: opts.couponCode || undefined,
      useCart: false,
      list_items: opts.list_items,
    }),
    cache: 'no-store',
  });

  const json = (await res.json()) as Envelope<ApiOrder[]> & { pricing?: CheckoutPreview };
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Checkout failed (${res.status})`, res.status);
  }
  return { orders: json.data ?? [], pricing: json.pricing };
}

export type PlaceOnlineResult =
  | { mode: 'stripe'; url: string; sessionId?: string; pricing?: CheckoutPreview }
  | { mode: 'paid'; orders: ApiOrder[]; pricing?: CheckoutPreview };

/**
 * Online / card checkout.
 * - With Stripe configured: returns Checkout Session `url` to redirect.
 * - Without Stripe: 503 unless ALLOW_MOCK_PAYMENT=true (then places as PAID).
 */
export async function placeOnlineOrder(opts: {
  addressId: string | number;
  couponCode?: string;
  list_items: CheckoutItem[];
  /** Stable key for this attempt — required by API; reuse on retries of the same click */
  idempotencyKey?: string;
}): Promise<PlaceOnlineResult> {
  const idempotencyKey =
    opts.idempotencyKey ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? `online-${crypto.randomUUID()}`
      : `online-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const res = await fetch(`${API_URL}/order/place-online`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCookie('csrfToken') ? { 'X-CSRF-Token': getCookie('csrfToken')! } : {}),
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      addressId: opts.addressId,
      couponCode: opts.couponCode || undefined,
      useCart: false,
      list_items: opts.list_items,
    }),
    cache: 'no-store',
  });

  const json = (await res.json()) as Envelope<ApiOrder[]> &
    CheckoutPreview & {
      url?: string;
      id?: string;
      pricing?: CheckoutPreview;
      message?: string;
      success?: boolean;
      error?: boolean;
    };

  if (!res.ok || json.success === false || json.error === true) {
    throw new ApiError(json.message || `Online payment failed (${res.status})`, res.status);
  }

  // Stripe Checkout Session shape (spread onto response)
  if (typeof json.url === 'string' && json.url.startsWith('http')) {
    return {
      mode: 'stripe',
      url: json.url,
      sessionId: json.id,
      pricing: json.pricing,
    };
  }

  // Mock / no-Stripe path — same envelope as place-cod
  return {
    mode: 'paid',
    orders: json.data ?? [],
    pricing: json.pricing,
  };
}

export async function createPaymentIntent(amount: number): Promise<{
  paymentId: string;
  amount: number;
  provider: string;
}> {
  return apiFetch('/payment/create-intent', {
    method: 'POST',
    json: { amount },
  });
}

export async function verifyPayment(orderIds: Array<string | number>, paymentId?: string) {
  return apiFetch('/payment/verify', {
    method: 'POST',
    json: { orderIds, paymentId },
  });
}

export async function fetchMyOrders(): Promise<ApiOrder[]> {
  return (await apiFetch<ApiOrder[]>('/order/my-orders')) ?? [];
}

export async function fetchInvoiceHtml(orderId: string | number): Promise<string> {
  const data = await apiFetch<{ html: string }>(`/order/invoice/${orderId}`);
  return data?.html ?? '';
}

/** Push local cart lines to the server (best-effort merge). */
export async function syncLocalCartToServer(
  items: Array<{ id: string; quantity: number }>,
): Promise<void> {
  for (const item of items) {
    try {
      await addServerCartItem(item.id, item.quantity);
    } catch {
      /* skip unavailable lines */
    }
  }
}

/** Push local wishlist product ids to the server. */
export async function syncLocalWishlistToServer(productIds: string[]): Promise<void> {
  for (const id of productIds) {
    try {
      await addServerWishlistItem(id);
    } catch {
      /* skip */
    }
  }
}

/** Footer newsletter signup (public). */
export async function subscribeNewsletter(
  email: string,
  source = 'footer',
): Promise<{ message?: string }> {
  return apiFetch('/newsletter/subscribe', {
    method: 'POST',
    json: { email, source },
  });
}

/** Public blog / journal posts. */
export async function fetchBlogPosts(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API_URL}/blog`, { next: { revalidate: 30 } });
  const json = (await res.json()) as Envelope<Record<string, unknown>[]>;
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || 'Failed to load blog', res.status);
  }
  return json.data ?? [];
}

export async function fetchBlogPostBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API_URL}/blog/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  const json = (await res.json()) as Envelope<Record<string, unknown>>;
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || 'Failed to load post', res.status);
  }
  return json.data ?? null;
}
