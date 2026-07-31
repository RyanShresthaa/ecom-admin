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
  image?: string[] | string;
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

/**
 * CSRF is double-submit. On cross-origin (localhost:3000 → :5000) the csrfToken
 * cookie is not readable via document.cookie — keep the value from JSON bodies.
 */
let csrfTokenMemory: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setCsrfToken(token: string | null | undefined) {
  csrfTokenMemory = token || null;
}

function getCsrfToken(): string | null {
  return csrfTokenMemory || getCookie('csrfToken');
}

function isAuthBootstrapPath(path: string): boolean {
  return (
    path.includes('/user/login') ||
    path.includes('/user/refresh-token') ||
    path.includes('/user/logout') ||
    path.includes('/user/google') ||
    path.includes('/user/login-pin') ||
    path.includes('/user/2fa/verify-login') ||
    path.includes('/user/2fa/email-otp') ||
    path.includes('/user/register')
  );
}

function pickCsrfFromBody(json: Envelope<unknown>): string | null {
  const data = json.data as { csrfToken?: string } | undefined;
  if (data && typeof data === 'object' && typeof data.csrfToken === 'string') {
    return data.csrfToken;
  }
  return null;
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
      if (!res.ok) return false;
      try {
        const json = (await res.json()) as Envelope<{ csrfToken?: string }>;
        if (json.success === false) return false;
        const next = pickCsrfFromBody(json);
        if (next) setCsrfToken(next);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown; _retry?: boolean; _csrfRetry?: boolean } = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCsrfToken();
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

  const csrfFromBody = pickCsrfFromBody(json as Envelope<unknown>);
  if (csrfFromBody) setCsrfToken(csrfFromBody);

  if (
    res.status === 403 &&
    !options._csrfRetry &&
    String(json.message || '').toLowerCase().includes('csrf')
  ) {
    try {
      const csrfRes = await fetch(`${API_URL}/user/csrf`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (csrfRes.ok) {
        const csrfJson = (await csrfRes.json()) as Envelope<{ csrfToken?: string }>;
        const next = pickCsrfFromBody(csrfJson);
        if (next) {
          setCsrfToken(next);
          return apiFetch<T>(path, { ...options, _csrfRetry: true });
        }
      }
    } catch {
      /* fall through */
    }
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
  createdAt?: string;
  created_at?: string;
};

export async function fetchUserProfile(): Promise<ApiUserProfile> {
  return apiFetch<ApiUserProfile>('/user/user-details');
}

/**
 * Quiet boot-time session check: always uses soft `/user/session` (HTTP 200),
 * then one refresh attempt if needed. Avoids console 401 noise when logged out.
 */
export async function fetchSessionProfile(): Promise<ApiUserProfile | null> {
  const readSession = async (): Promise<ApiUserProfile | null> => {
    const res = await fetch(`${API_URL}/user/session`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    try {
      const json = (await res.json()) as Envelope<ApiUserProfile | null>;
      const csrfFromBody = pickCsrfFromBody(json as Envelope<unknown>);
      if (csrfFromBody) setCsrfToken(csrfFromBody);
      if (json.data && typeof json.data === 'object' && (json.data.email || json.data.name)) {
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const first = await readSession();
  if (first) return first;

  const refreshed = await refreshSession();
  if (!refreshed) return null;
  return readSession();
}

type AuthLoginData = {
  csrfToken?: string;
  user?: ApiUserProfile;
};

/** Register a customer account (email verification may be required before login). */
export async function registerUser(opts: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  name?: string;
  email?: string;
  requiresEmailVerification?: boolean;
  emailSent?: boolean;
  message?: string;
}> {
  return apiFetch('/user/register', {
    method: 'POST',
    json: opts,
  });
}

/** Confirm signup email with the 6-digit OTP from the verification email. */
export async function verifySignupEmail(opts: {
  email: string;
  otp: string;
}): Promise<{ message?: string }> {
  const data = await apiFetch<{ message?: string } | undefined>('/user/verify-email', {
    method: 'POST',
    json: { email: opts.email, otp: opts.otp },
  });
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data;
  }
  return { message: 'Email verified. You can sign in now.' };
}

/** Resend the signup email verification OTP. */
export async function resendSignupVerifyEmail(email: string): Promise<string> {
  const data = await apiFetch<{ message?: string } | undefined>('/user/resend-verify-email', {
    method: 'POST',
    json: { email },
  });
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'If an unverified account exists for that email, we sent a new verification code.';
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch<unknown>('/user/logout', { method: 'POST', json: {} });
  } catch {
    /* clear local state even if API call fails */
  } finally {
    setCsrfToken(null);
  }
}

/** Request a password-reset OTP email (always returns a generic success message). */
export async function requestPasswordReset(email: string): Promise<string> {
  const data = await apiFetch<{ message?: string } | undefined>('/user/forgot-password', {
    method: 'POST',
    json: { email },
  });
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'If an account exists for that email, we sent a one-time code.';
}

/** Verify the OTP from the forgot-password email. */
export async function verifyForgotPasswordOtp(opts: {
  email: string;
  otp: string;
}): Promise<string> {
  const data = await apiFetch<{ message?: string } | undefined>(
    '/user/verify-forgot-password-otp',
    {
      method: 'POST',
      json: { email: opts.email, otp: opts.otp },
    },
  );
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'OTP verified';
}

/** Set a new password after OTP verification. */
export async function resetPasswordWithOtp(opts: {
  email: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<string> {
  const data = await apiFetch<{ message?: string } | undefined>('/user/reset-password', {
    method: 'POST',
    json: {
      email: opts.email,
      newPassword: opts.newPassword,
      confirmPassword: opts.confirmPassword,
    },
  });
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'Password updated successfully';
}

/** Change password while logged in (requires current password). */
export async function updatePassword(opts: {
  currentPassword: string;
  password: string;
}): Promise<void> {
  await apiFetch('/user/update-user', {
    method: 'PUT',
    json: {
      currentPassword: opts.currentPassword,
      password: opts.password,
    },
  });
}

export type NotificationPrefs = {
  orderUpdates: boolean;
  marketingEmails: boolean;
  reviewRequests: boolean;
  publicProfile: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  shareWishlist: boolean;
  totpEnabled?: boolean;
  shareUrl?: string | null;
  twilioConfigured?: boolean;
  webPushConfigured?: boolean;
};

function normalizePrefs(data: NotificationPrefs | null | undefined): NotificationPrefs {
  return {
    orderUpdates: data?.orderUpdates !== false,
    marketingEmails: Boolean(data?.marketingEmails),
    reviewRequests: Boolean(data?.reviewRequests),
    publicProfile: Boolean(data?.publicProfile),
    smsNotifications: Boolean(data?.smsNotifications),
    pushNotifications: Boolean(data?.pushNotifications),
    shareWishlist: Boolean(data?.shareWishlist),
    totpEnabled: Boolean(data?.totpEnabled),
    shareUrl: data?.shareUrl ?? null,
    twilioConfigured: Boolean(data?.twilioConfigured),
    webPushConfigured: Boolean(data?.webPushConfigured),
  };
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const data = await apiFetch<NotificationPrefs>('/user/preferences');
  return normalizePrefs(data);
}

export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const body: Record<string, boolean> = {};
  if (typeof patch.orderUpdates === 'boolean') body.orderUpdates = patch.orderUpdates;
  if (typeof patch.marketingEmails === 'boolean') body.marketingEmails = patch.marketingEmails;
  if (typeof patch.reviewRequests === 'boolean') body.reviewRequests = patch.reviewRequests;
  if (typeof patch.publicProfile === 'boolean') body.publicProfile = patch.publicProfile;
  if (typeof patch.smsNotifications === 'boolean') body.smsNotifications = patch.smsNotifications;
  if (typeof patch.pushNotifications === 'boolean') body.pushNotifications = patch.pushNotifications;
  if (typeof patch.shareWishlist === 'boolean') body.shareWishlist = patch.shareWishlist;
  const data = await apiFetch<NotificationPrefs>('/user/preferences', {
    method: 'PUT',
    json: body,
  });
  return normalizePrefs(data);
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
};

export async function fetchVapidPublicKey(): Promise<{ publicKey: string | null; configured: boolean }> {
  const data = await apiFetch<{ publicKey: string | null; configured: boolean }>(
    '/push/vapid-public-key',
  );
  return {
    publicKey: data?.publicKey ?? null,
    configured: Boolean(data?.configured),
  };
}

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await apiFetch('/push/subscribe', {
    method: 'POST',
    json: { subscription },
  });
}

export async function unsubscribePush(endpoint?: string): Promise<void> {
  await apiFetch('/push/unsubscribe', {
    method: 'DELETE',
    json: endpoint ? { endpoint } : {},
  });
}

export type WishlistShareInfo = {
  token: string;
  url: string;
};

export type SharedWishlistPayload = {
  token: string;
  owner: { id: number | string; name: string; avatar?: string | null };
  items: Array<{
    id: number;
    productId: number;
    product?: ApiProduct;
    createdAt?: string;
  }>;
  sharedAt?: string;
};

export async function fetchMyWishlistShare(): Promise<WishlistShareInfo | null> {
  const data = await apiFetch<WishlistShareInfo | null>('/wishlist/share');
  if (!data?.token || !data?.url) return null;
  return data;
}

export async function createWishlistShare(): Promise<WishlistShareInfo> {
  return apiFetch<WishlistShareInfo>('/wishlist/share', { method: 'POST', json: {} });
}

export async function revokeWishlistShare(): Promise<void> {
  await apiFetch('/wishlist/share', { method: 'DELETE' });
}

export async function fetchSharedWishlist(token: string): Promise<SharedWishlistPayload> {
  return apiFetch<SharedWishlistPayload>(`/wishlist/shared/${encodeURIComponent(token)}`);
}

export type TwoFactorSetup = {
  secret: string;
  otpauthUrl: string;
  qrUrl: string;
};

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  return apiFetch<TwoFactorSetup>('/user/2fa/setup', { method: 'POST', json: {} });
}

export async function enableTwoFactor(code: string): Promise<void> {
  await apiFetch('/user/2fa/enable', { method: 'POST', json: { code } });
}

export async function disableTwoFactor(opts: { code: string; password?: string }): Promise<void> {
  await apiFetch('/user/2fa/disable', { method: 'POST', json: opts });
}

export type LoginResult =
  | { requires2fa: true; tempToken: string }
  | { requires2fa?: false; user: ApiUserProfile | null };

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = await apiFetch<AuthLoginData & { requires2fa?: boolean; tempToken?: string }>(
    '/user/login',
    {
      method: 'POST',
      json: { email, password },
    },
  );
  if (data?.requires2fa && data.tempToken) {
    return { requires2fa: true, tempToken: data.tempToken };
  }
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return {
    requires2fa: false,
    user: data?.user ?? (await fetchUserProfile()),
  };
}

export async function loginWithGoogleCredential(
  credential: string,
): Promise<LoginResult> {
  const data = await apiFetch<AuthLoginData & { requires2fa?: boolean; tempToken?: string }>(
    '/user/google',
    {
      method: 'POST',
      json: { credential },
    },
  );
  if (data?.requires2fa && data.tempToken) {
    return { requires2fa: true, tempToken: data.tempToken };
  }
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return {
    requires2fa: false,
    user: data?.user ?? (await fetchUserProfile()),
  };
}

export async function sendTwoFactorEmailOtp(tempToken: string): Promise<{
  tempToken: string;
  message: string;
}> {
  const data = await apiFetch<{ tempToken?: string } | undefined>('/user/2fa/email-otp', {
    method: 'POST',
    json: { tempToken },
  });
  const next =
    data && typeof data === 'object' && typeof data.tempToken === 'string' ? data.tempToken : '';
  if (!next) {
    throw new ApiError('Could not send sign-in code', 500);
  }
  return {
    tempToken: next,
    message: 'We emailed a 6-digit backup code. Check inbox and spam.',
  };
}

export async function verifyTwoFactorLogin(opts: {
  tempToken: string;
  code: string;
}): Promise<ApiUserProfile | null> {
  const data = await apiFetch<AuthLoginData>('/user/2fa/verify-login', {
    method: 'POST',
    json: opts,
  });
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data?.user ?? (await fetchUserProfile());
}

export type PublicProfile = {
  id: number | string;
  name: string;
  avatar?: string | null;
  bio?: string;
  memberSince?: string;
  reviews: Array<{
    id: number | string;
    rating: number;
    comment?: string;
    productId?: number | string;
    productName?: string;
    createdAt?: string;
  }>;
};

export async function fetchPublicProfile(id: string | number): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/user/public/${id}`);
}

export async function exportAccountData(): Promise<unknown> {
  return apiFetch<unknown>('/user/export-account');
}

export async function deleteAccount(opts: {
  confirm: 'DELETE';
  password?: string;
}): Promise<void> {
  await apiFetch('/user/delete-account', {
    method: 'DELETE',
    json: opts,
  });
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
    const csrf = getCsrfToken();
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

/** Normalize product image URLs for Next.js Image (same rules as mapProduct). */
function toStorefrontImageUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const stripped = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/i, '');
  if (stripped.startsWith('/')) return stripped;
  if (trimmed.startsWith('/')) return trimmed;
  return trimmed;
}

function firstProductImage(raw: ApiProduct | null | undefined): string {
  if (!raw) return '';
  const fromArray = Array.isArray(raw.image)
    ? raw.image.map(toStorefrontImageUrl).filter(Boolean)
    : [];
  if (fromArray[0]) return fromArray[0];
  if (typeof raw.image === 'string') {
    const asString = toStorefrontImageUrl(raw.image);
    if (asString) return asString;
    // JSON string array from some DB drivers
    try {
      const parsed = JSON.parse(raw.image) as unknown;
      if (Array.isArray(parsed)) {
        const urls = parsed.map(toStorefrontImageUrl).filter(Boolean);
        if (urls[0]) return urls[0];
      }
    } catch {
      /* not JSON */
    }
  }
  return toStorefrontImageUrl(raw.image_url);
}

function productBasics(raw: ApiProduct | null | undefined, fallbackId: string | number) {
  const details =
    typeof raw?.more_details === 'string'
      ? (JSON.parse(raw.more_details || '{}') as Record<string, unknown>)
      : ((raw?.more_details as Record<string, unknown>) ?? {});
  const name = raw?.name?.trim() || 'Product';
  const id = String(raw?.id ?? raw?._id ?? fallbackId);
  const image = firstProductImage(raw);
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
    image,
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
    stock: basics.stock,
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
    rating: 0,
    reviewsCount: 0,
    stock: basics.stock,
    inStock: basics.stock > 0,
    onSale: Boolean(basics.discountBadge),
  };
}

// ─── Address (auth) ─────────────────────────────────────────

export async function fetchAddresses(): Promise<ApiAddress[]> {
  const data = await apiFetch<ApiAddress[] | null>('/address/get');
  return Array.isArray(data) ? data : [];
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

export async function deleteAddress(id: string | number): Promise<void> {
  await apiFetch('/address/delete', {
    method: 'DELETE',
    json: { _id: id },
  });
}

// ─── Saved payment methods (auth) ───────────────────────────

export type ApiPaymentMethod = {
  id: number;
  _id?: number;
  type: 'card' | 'bank' | string;
  brand?: string | null;
  last4: string;
  exp_month?: number | null;
  exp_year?: number | null;
  bank_name?: string | null;
  account_type?: string | null;
  billing_name?: string | null;
  billing_zip?: string | null;
  routing_last4?: string | null;
  is_default?: boolean;
  isDefault?: boolean;
};

export async function fetchPaymentMethods(): Promise<ApiPaymentMethod[]> {
  return (await apiFetch<ApiPaymentMethod[]>('/payment/methods')) ?? [];
}

export async function createPaymentMethod(body: Record<string, unknown>): Promise<ApiPaymentMethod> {
  return apiFetch<ApiPaymentMethod>('/payment/methods', { method: 'POST', json: body });
}

export async function deletePaymentMethod(id: string | number): Promise<void> {
  await apiFetch('/payment/methods', {
    method: 'DELETE',
    json: { _id: id },
  });
}

export async function setDefaultPaymentMethod(id: string | number): Promise<ApiPaymentMethod> {
  return apiFetch<ApiPaymentMethod>('/payment/methods/default', {
    method: 'PUT',
    json: { _id: id },
  });
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
      ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
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
      ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
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

export async function cancelMyOrder(orderId: string | number): Promise<ApiOrder | null> {
  return (await apiFetch<ApiOrder>('/order/cancel', {
    method: 'POST',
    json: { orderId },
  })) ?? null;
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
