'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useCart } from '@/shared/context/CartContext';
import { useAuth } from '@/shared/context/AuthContext';
import {
  ApiError,
  createAddress,
  fetchAddresses,
  fetchPaymentMethods,
  placeCodOrder,
  placeOnlineOrder,
  previewCheckout,
  type ApiAddress,
  type ApiPaymentMethod,
  type CheckoutPreview,
} from '@/lib/api';
import { InvoiceButton } from '@/shared/ui/InvoiceViewer';
import CountryStateCityFields from '@/shared/ui/CountryStateCityFields';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';
import {
  firstError,
  validateShippingAddress,
  type ShippingAddressInput,
} from '@/lib/addressValidation';

type AddressForm = {
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  mobile: string;
};

type PayMethod = 'cod' | 'online';

const EMPTY_ADDRESS: AddressForm = {
  address_line: '',
  city: '',
  state: '',
  pincode: '',
  country: 'United States',
  mobile: '',
};

export default function Checkout() {
  const router = useRouter();
  const { formatMoney, regionMode } = useShopLocale();
  const { isLoggedIn, isLoaded: authLoaded } = useAuth();
  const {
    cart,
    subtotal,
    discount,
    promoCode,
    applyPromoCode,
    orderTotal,
    clearCart,
    clearPromoCode,
  } = useCart();

  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [promoInput, setPromoInput] = useState(promoCode || '');
  const [promoMsg, setPromoMsg] = useState('');
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('online');
  const [placing, setPlacing] = useState(false);
  const placingLock = useRef(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ShippingAddressInput, string>>>(
    {},
  );
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successInvoiceLineId, setSuccessInvoiceLineId] = useState<string | null>(null);
  const [successPaymentStatus, setSuccessPaymentStatus] = useState('CASH ON DELIVERY');

  const loggedIn = !authLoaded ? null : isLoggedIn;

  const listItems = useMemo(
    () => cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [cart],
  );

  const selectedAddress = useMemo(
    () => addresses.find((a) => String(a.id ?? a._id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId],
  );

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      country: regionMode === 'nepal' ? 'Nepal' : prev.country || 'United States',
    }));
  }, [regionMode]);

  useEffect(() => {
    if (!authLoaded) return;
    if (!isLoggedIn) {
      setAddresses([]);
      setPaymentMethods([]);
      setSelectedAddressId('');
      setAddressesLoading(false);
      return;
    }

    let cancelled = false;
    setAddressesLoading(true);
    (async () => {
      try {
        const [rows, methods] = await Promise.all([
          fetchAddresses(),
          fetchPaymentMethods().catch(() => [] as ApiPaymentMethod[]),
        ]);
        if (cancelled) return;
        setAddresses(rows);
        setPaymentMethods(methods);
        setSelectedAddressId((prev) => {
          if (prev && rows.some((a) => String(a.id ?? a._id) === prev)) return prev;
          return rows[0] ? String(rows[0].id ?? rows[0]._id) : '';
        });
        const defaultMethod =
          methods.find((m) => m.is_default || m.isDefault) || methods[0];
        if (defaultMethod) {
          setSelectedPaymentMethodId(String(defaultMethod.id ?? defaultMethod._id));
          if (defaultMethod.type === 'card' || defaultMethod.type === 'bank') {
            setPayMethod('online');
          }
        }
      } catch {
        if (!cancelled) {
          setAddresses([]);
          setSelectedAddressId('');
        }
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || listItems.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await previewCheckout({
          couponCode: promoCode || undefined,
          list_items: listItems,
        });
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, listItems, promoCode]);

  const displaySubtotal = preview?.subtotal ?? subtotal;
  const displayDiscount = preview?.couponDiscount ?? discount;
  const displayShipping = preview?.shippingAmt ?? 0;
  const displayTax = preview?.taxAmt ?? 0;
  const displayTotal = preview?.totalAmt ?? orderTotal;

  async function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    const result = await applyPromoCode(promoInput);
    setPromoMsg(result.message);
  }

  async function resolveAddressId(): Promise<string> {
    if (selectedAddressId) {
      const existing = addresses.find(
        (a) => String(a.id ?? a._id) === String(selectedAddressId),
      );
      if (existing) {
        const check = validateShippingAddress(
          {
            address_line: existing.address_line,
            city: existing.city,
            state: existing.state || '',
            pincode: String(existing.pincode || ''),
            country: existing.country,
            mobile: String(existing.mobile || ''),
          },
          regionMode,
        );
        if (!check.ok) {
          setSelectedAddressId('');
          setFieldErrors(check.errors);
          throw new Error(
            `${firstError(check.errors)} Please enter a valid US shipping address below.`,
          );
        }
      }
      return selectedAddressId;
    }

    const check = validateShippingAddress(form, regionMode);
    if (!check.ok) {
      setFieldErrors(check.errors);
      throw new Error(firstError(check.errors) || 'Please fix your shipping address.');
    }
    setFieldErrors({});

    const created = await createAddress(check.value);
    const id = String(created.id ?? created._id);
    setSelectedAddressId(id);
    setAddresses((prev) => [created, ...prev]);
    return id;
  }

  function finishLocalSuccess(
    orders: { orderId?: string; id?: number; _id?: number; payment_status?: string }[],
    fallbackStatus: string,
  ) {
    const first = orders[0];
    const orderRef = first?.orderId || String(first?.id ?? first?._id ?? '');
    const lineId = first?.id ?? first?._id;
    clearCart();
    clearPromoCode();
    setSuccessOrderId(orderRef || 'placed');
    setSuccessInvoiceLineId(lineId != null ? String(lineId) : null);
    setSuccessPaymentStatus(first?.payment_status || fallbackStatus);
  }

  async function handlePlaceOrder() {
    if (placingLock.current) return;
    placingLock.current = true;
    setError('');
    setPlacing(true);
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `${payMethod === 'online' ? 'online' : 'cod'}-${crypto.randomUUID()}`
        : `${payMethod === 'online' ? 'online' : 'cod'}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      if (!isLoggedIn) {
        setError(
          'Sign in is required to place an order. Login will be available soon — your cart is saved locally.',
        );
        return;
      }

      const addressId = await resolveAddressId();
      const payload = {
        addressId,
        couponCode: promoCode || undefined,
        list_items: listItems,
        idempotencyKey,
      };

      if (payMethod === 'online') {
        const result = await placeOnlineOrder(payload);
        if (result.mode === 'stripe') {
          // Leave cart until Stripe returns (success page clears it)
          window.location.href = result.url;
          return;
        }
        // Mock path only when ALLOW_MOCK_PAYMENT=true on the server
        finishLocalSuccess(result.orders, 'PAID');
      } else {
        const result = await placeCodOrder(payload);
        finishLocalSuccess(result.orders, 'CASH ON DELIVERY');
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError('Sign in is required to place an order. Your cart is saved on this device.');
      } else if (err instanceof ApiError && err.status === 503) {
        setError(
          err.message ||
            'Online payment is not configured yet. Use Cash on Delivery, or add Stripe keys on the backend.',
        );
      } else {
        setError(err instanceof Error ? err.message : 'Could not place order');
      }
    } finally {
      placingLock.current = false;
      setPlacing(false);
    }
  }

  if (cart.length === 0 && !successOrderId) {
    return (
      <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
        <div className="w-full lg:max-w-none mx-auto">
          <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-12 lg:p-[4vw] text-center border border-primary/10 shadow-xs flex flex-col items-center justify-center my-8 lg:my-[2vw]">
            <div className="w-20 h-20 lg:w-[5vw] lg:h-[5vw] rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mb-6 lg:mb-[1.5vw]">
              <Icon icon="ph:shopping-bag-open-light" className="w-10 h-10 lg:w-[2.5vw] lg:h-[2.5vw]" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-[2vw] font-medium text-[#2A170F] mb-2 lg:mb-[0.5vw]">
              Your cart is empty
            </h1>
            <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70 max-w-md lg:max-w-none mb-8 lg:mb-[2vw]">
              Add handcrafted pieces to your cart before checking out.
            </p>
            <Link
              href="/products"
              className="px-8 lg:px-[2vw] py-4 lg:py-[0.9vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs lg:text-[0.75vw] uppercase tracking-wider hover:bg-primary-dark transition-all duration-300 shadow-md"
            >
              Browse products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (successOrderId) {
    return (
      <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
        <div className="w-full lg:max-w-none mx-auto text-center bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-10 lg:p-[3vw] shadow-xs">
          <div className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 lg:mb-[1.2vw]">
            <Icon icon="ph:check-bold" className="w-8 h-8 lg:w-[2vw] lg:h-[2vw]" />
          </div>
          <h1 className="font-heading text-3xl lg:text-[2.2vw] font-bold text-[#2A170F] mb-2 lg:mb-[0.5vw]">Order placed</h1>
          <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70 mb-2 lg:mb-[0.5vw]">
            {successPaymentStatus.toUpperCase().includes('PAID')
              ? 'Payment received — thank you.'
              : 'Cash on delivery confirmed.'}
          </p>
          {successOrderId !== 'placed' && (
            <p className="font-mono text-xs lg:text-[0.75vw] text-body/60 mb-6 lg:mb-[1.5vw]">Order #{successOrderId}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-[0.8vw] justify-center flex-wrap">
            {successInvoiceLineId && (
              <InvoiceButton
                orderLineId={successInvoiceLineId}
                orderId={successOrderId !== 'placed' ? successOrderId : undefined}
                paymentStatus={successPaymentStatus}
                deliveryStatus="pending"
                className="px-6 lg:px-[1.5vw] py-3 lg:py-[0.7vw] rounded-full bg-primary text-white text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 lg:gap-[0.4vw] hover:bg-primary-dark"
              />
            )}
            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="px-6 lg:px-[1.5vw] py-3 lg:py-[0.7vw] rounded-full border border-primary/25 text-primary-dark text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider cursor-pointer"
            >
              View my orders
            </button>
            <Link
              href="/products"
              className="px-6 lg:px-[1.5vw] py-3 lg:py-[0.7vw] rounded-full border border-primary/25 text-primary-dark text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loggedIn === null) {
    return (
      <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw]">
        <div className="w-full lg:max-w-none mx-auto text-center">
          <h1 className="font-heading text-4xl lg:text-[3vw] font-bold text-[#2A170F] mb-4 lg:mb-[1vw]">Checkout</h1>
          <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw]">
        <div className="w-full lg:max-w-none mx-auto">
          <div className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-10 lg:p-[3vw] shadow-xs text-center">
            <div className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-5 lg:mb-[1.2vw]">
              <Icon icon="ph:lock-key-fill" className="w-8 h-8 lg:w-[2vw] lg:h-[2vw]" />
            </div>
            <h1 className="font-heading text-3xl lg:text-[2.2vw] font-bold text-[#2A170F] mb-3 lg:mb-[0.8vw]">
              Sign in required
            </h1>
            <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70 mb-2 lg:mb-[0.5vw] leading-relaxed">
              Guest checkout is disabled. Please sign in to place an order. Your cart stays saved on
              this device.
            </p>
            <p className="font-secondary text-xs lg:text-[0.75vw] text-body/50 mb-8 lg:mb-[2vw]">
              Customer login pages are coming soon. You can keep shopping and return here after
              signing in.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-[0.8vw] justify-center">
              <Link
                href="/cart"
                className="inline-flex px-8 lg:px-[2vw] py-3.5 lg:py-[0.8vw] rounded-full bg-primary text-white text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider"
              >
                Back to cart
              </Link>
              <Link
                href="/products"
                className="inline-flex px-8 lg:px-[2vw] py-3.5 lg:py-[0.8vw] rounded-full border border-primary/25 text-primary-dark text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider"
              >
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.2vw] font-bold text-[#2A170F] tracking-tight mb-2 lg:mb-[0.5vw]">
          Checkout
        </h1>
        <p className="font-secondary text-sm sm:text-base lg:text-[0.9vw] text-body/70 mb-8 lg:mb-[2vw]">
          Review your order and choose a payment method.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          <div className="lg:col-span-7 flex flex-col gap-6 lg:gap-[1.5vw]">
            <section className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-6 lg:p-[1.5vw] shadow-xs">
              <div className="flex items-center justify-between gap-3 lg:gap-[0.8vw] mb-4 lg:mb-[1vw]">
                <h2 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">Shipping address</h2>
                <Link
                  href="/addresses"
                  className="text-xs lg:text-[0.75vw] font-semibold text-primary hover:underline shrink-0"
                >
                  Manage addresses
                </Link>
              </div>

              {addressesLoading && (
                <p className="font-secondary text-sm lg:text-[0.85vw] text-body/60 mb-4 lg:mb-[1vw]">Loading saved addresses…</p>
              )}

              {!addressesLoading && addresses.length > 0 && (
                <div className="flex flex-col gap-2 lg:gap-[0.5vw] mb-4 lg:mb-[1vw]">
                  {addresses.map((addr) => {
                    const id = String(addr.id ?? addr._id);
                    return (
                      <label
                        key={id}
                        className={`flex items-start gap-3 lg:gap-[0.8vw] p-4 lg:p-[1vw] rounded-2xl lg:rounded-[1vw] border cursor-pointer ${
                          selectedAddressId === id
                            ? 'border-primary bg-primary-lighter/20'
                            : 'border-primary/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === id}
                          onChange={() => setSelectedAddressId(id)}
                          className="mt-1 lg:mt-[0.2vw]"
                        />
                        <span className="font-secondary text-sm lg:text-[0.85vw] text-primary-dark">
                          {String(addr.address_line || '')
                            .replace(/^\[[^\]]+\]\s*/, '')
                            .replace(/^.*? — /, '')}
                          , {addr.city}
                          {addr.state ? `, ${addr.state}` : ''} {addr.pincode || ''}
                          <br />
                          {addr.country}
                          {addr.mobile ? ` · ${addr.mobile}` : ''}
                        </span>
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedAddressId('')}
                    className="text-xs lg:text-[0.75vw] text-primary font-semibold self-start cursor-pointer"
                  >
                    + Use a new address
                  </button>
                </div>
              )}

              {!addressesLoading && addresses.length === 0 && (
                <p className="font-secondary text-sm lg:text-[0.85vw] text-body/60 mb-4 lg:mb-[1vw]">
                  No saved addresses yet. Enter one below — it will be saved to your profile for next
                  time.
                </p>
              )}

              {selectedAddress && (
                <p className="font-secondary text-xs lg:text-[0.75vw] text-body/50 mb-1 lg:mb-[0.2vw]">
                  Shipping to your selected saved address.
                </p>
              )}

              {!selectedAddressId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-[0.8vw]">
                  <label className="flex flex-col gap-1 lg:gap-[0.2vw] sm:col-span-2">
                    <span className="text-[11px] lg:text-[0.65vw] uppercase tracking-wider text-body/60 font-semibold">
                      Street address
                    </span>
                    <input
                      value={form.address_line}
                      placeholder="123 Main St, Apt 4"
                      autoComplete="street-address"
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, address_line: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, address_line: undefined }));
                      }}
                      className={`h-11 lg:h-[2.6vw] rounded-xl lg:rounded-[0.8vw] border px-3 lg:px-[0.8vw] text-sm lg:text-[0.8vw] font-secondary focus:outline-none focus:border-primary ${
                        fieldErrors.address_line ? 'border-red-400' : 'border-primary/15'
                      }`}
                    />
                    {fieldErrors.address_line && (
                      <span className="text-[11px] lg:text-[0.65vw] text-red-600 font-secondary">
                        {fieldErrors.address_line}
                      </span>
                    )}
                  </label>

                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-[0.8vw] [&>div>label]:!mb-1 [&>div>label]:text-[11px] [&>div>label]:lg:text-[0.65vw] [&>div>label]:uppercase [&>div>label]:tracking-wider [&>div>label]:text-body/60 [&>div>label]:font-semibold">
                    <CountryStateCityFields
                      country={form.country}
                      state={form.state}
                      city={form.city}
                      onCountryChange={(country) => {
                        setForm((prev) => ({ ...prev, country, state: '', city: '' }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          country: undefined,
                          state: undefined,
                          city: undefined,
                        }));
                      }}
                      onStateChange={(state) => {
                        setForm((prev) => ({ ...prev, state, city: '' }));
                        setFieldErrors((prev) => ({ ...prev, state: undefined, city: undefined }));
                      }}
                      onCityChange={(city) => {
                        setForm((prev) => ({ ...prev, city }));
                        setFieldErrors((prev) => ({ ...prev, city: undefined }));
                      }}
                      triggerClassName="!rounded-xl lg:!rounded-[0.8vw] !py-2.5 lg:!py-[0.6vw] border-primary/15"
                    />
                  </div>
                  {(fieldErrors.country || fieldErrors.state || fieldErrors.city) && (
                    <p className="sm:col-span-2 text-[11px] lg:text-[0.65vw] text-red-600 font-secondary">
                      {fieldErrors.country || fieldErrors.state || fieldErrors.city}
                    </p>
                  )}

                  <label className="flex flex-col gap-1 lg:gap-[0.2vw]">
                    <span className="text-[11px] lg:text-[0.65vw] uppercase tracking-wider text-body/60 font-semibold">
                      ZIP / Postal code
                    </span>
                    <input
                      value={form.pincode}
                      placeholder={form.country === 'Nepal' ? '44600' : '78701'}
                      autoComplete="postal-code"
                      inputMode="numeric"
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, pincode: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, pincode: undefined }));
                      }}
                      className={`h-11 lg:h-[2.6vw] rounded-xl lg:rounded-[0.8vw] border px-3 lg:px-[0.8vw] text-sm lg:text-[0.8vw] font-secondary focus:outline-none focus:border-primary ${
                        fieldErrors.pincode ? 'border-red-400' : 'border-primary/15'
                      }`}
                    />
                    {fieldErrors.pincode && (
                      <span className="text-[11px] lg:text-[0.65vw] text-red-600 font-secondary">
                        {fieldErrors.pincode}
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 lg:gap-[0.2vw]">
                    <span className="text-[11px] lg:text-[0.65vw] uppercase tracking-wider text-body/60 font-semibold">
                      Mobile phone
                    </span>
                    <input
                      value={form.mobile}
                      placeholder={form.country === 'Nepal' ? '98XXXXXXXX' : '(415) 555-2671'}
                      autoComplete="tel"
                      inputMode="numeric"
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, mobile: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, mobile: undefined }));
                      }}
                      className={`h-11 lg:h-[2.6vw] rounded-xl lg:rounded-[0.8vw] border px-3 lg:px-[0.8vw] text-sm lg:text-[0.8vw] font-secondary focus:outline-none focus:border-primary ${
                        fieldErrors.mobile ? 'border-red-400' : 'border-primary/15'
                      }`}
                    />
                    {fieldErrors.mobile && (
                      <span className="text-[11px] lg:text-[0.65vw] text-red-600 font-secondary">
                        {fieldErrors.mobile}
                      </span>
                    )}
                  </label>

                  <p className="sm:col-span-2 text-[11px] lg:text-[0.65vw] text-body/50 font-secondary">
                    Addresses are limited to the United States and Nepal. Pick country, then search
                    state/province and city from the list.
                  </p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-6 lg:p-[1.5vw] shadow-xs">
              <h2 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F] mb-4 lg:mb-[1vw]">Items</h2>
              <div className="flex flex-col gap-4 lg:gap-[1vw]">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 lg:gap-[1vw]">
                    <div className="relative w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-xl lg:rounded-[0.8vw] overflow-hidden bg-[#FAF6F2] border border-primary/10 shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm lg:text-[0.9vw] font-semibold text-[#2A170F] truncate">
                        {item.name}
                      </p>
                      <p className="font-secondary text-xs lg:text-[0.75vw] text-body/60">Qty {item.quantity}</p>
                    </div>
                    <p className="font-secondary text-sm lg:text-[0.9vw] font-semibold text-primary-dark">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6 lg:gap-[1.5vw]">
            <section className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-6 lg:p-[1.5vw] shadow-xs flex flex-col gap-4 lg:gap-[1vw]">
              <h2 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">Promo code</h2>
              <form onSubmit={handleApplyPromo} className="flex gap-2 lg:gap-[0.5vw]">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 h-11 lg:h-[2.6vw] rounded-full border border-primary/15 px-4 lg:px-[1vw] text-sm lg:text-[0.8vw] font-secondary focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-5 lg:px-[1.2vw] h-11 lg:h-[2.6vw] rounded-full bg-[#8C523A] text-white text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Apply
                </button>
              </form>
              {promoMsg && (
                <p
                  className={`text-xs lg:text-[0.75vw] font-secondary ${
                    promoMsg.toLowerCase().includes('applied') || promoMsg.toLowerCase().includes('coupon')
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {promoMsg}
                </p>
              )}
              {promoCode && (
                <button
                  type="button"
                  onClick={() => {
                    clearPromoCode();
                    setPromoInput('');
                    setPromoMsg('');
                  }}
                  className="text-xs lg:text-[0.75vw] text-body/60 hover:text-red-600 self-start cursor-pointer"
                >
                  Remove {promoCode}
                </button>
              )}
            </section>

            <section className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-6 lg:p-[1.5vw] shadow-xs flex flex-col gap-4 lg:gap-[1vw]">
              <h2 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">Payment method</h2>

              {paymentMethods.length > 0 ? (
                <div className="flex flex-col gap-2 lg:gap-[0.5vw]">
                  <p className="text-xs lg:text-[0.75vw] text-body/70 font-secondary">
                    Saved methods from your profile. Card charges still complete via Stripe — you
                    don&apos;t re-enter card numbers here.
                  </p>
                  {paymentMethods.map((method) => {
                    const id = String(method.id ?? method._id);
                    const label =
                      method.type === 'bank'
                        ? `${method.bank_name || 'Bank'} ····${method.last4}`
                        : `${(method.brand || 'Card').toString()} ····${method.last4}`;
                    const meta =
                      method.type === 'card' && method.exp_month && method.exp_year
                        ? `Expires ${String(method.exp_month).padStart(2, '0')}/${method.exp_year}`
                        : method.billing_name || '';
                    return (
                      <label
                        key={id}
                        className={`flex items-start gap-3 lg:gap-[0.8vw] p-4 lg:p-[1vw] rounded-2xl lg:rounded-[1vw] border cursor-pointer ${
                          selectedPaymentMethodId === id && payMethod === 'online'
                            ? 'border-primary bg-primary-lighter/20'
                            : 'border-primary/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedPayMethod"
                          checked={selectedPaymentMethodId === id && payMethod === 'online'}
                          onChange={() => {
                            setSelectedPaymentMethodId(id);
                            setPayMethod('online');
                          }}
                          className="mt-1 lg:mt-[0.2vw]"
                        />
                        <span className="font-secondary text-sm lg:text-[0.85vw] text-primary-dark">
                          <span className="font-semibold block capitalize">{label}</span>
                          {meta ? <span className="text-xs lg:text-[0.75vw] text-body/60">{meta}</span> : null}
                        </span>
                      </label>
                    );
                  })}
                  <Link href="/payments" className="text-xs lg:text-[0.75vw] text-primary font-semibold self-start">
                    Manage payment methods
                  </Link>
                </div>
              ) : (
                <p className="text-xs lg:text-[0.75vw] text-body/70 font-secondary">
                  No cards saved yet.{' '}
                  <Link href="/payments/new" className="text-primary font-semibold underline">
                    Add one in your profile
                  </Link>{' '}
                  for next time, or pay with Stripe / COD below.
                </p>
              )}

              <div className="flex flex-col gap-2 lg:gap-[0.5vw] pt-2 lg:pt-[0.5vw] border-t border-primary/10">
                <label
                  className={`flex items-start gap-3 lg:gap-[0.8vw] p-4 lg:p-[1vw] rounded-2xl lg:rounded-[1vw] border cursor-pointer ${
                    payMethod === 'online'
                      ? 'border-primary bg-primary-lighter/20'
                      : 'border-primary/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'online'}
                    onChange={() => setPayMethod('online')}
                    className="mt-1 lg:mt-[0.2vw]"
                  />
                  <span className="font-secondary text-sm lg:text-[0.85vw] text-primary-dark">
                    <span className="font-semibold block">Card (Stripe)</span>
                    Pay securely online. You&apos;ll be redirected — no card typing on this page.
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 lg:gap-[0.8vw] p-4 lg:p-[1vw] rounded-2xl lg:rounded-[1vw] border cursor-pointer ${
                    payMethod === 'cod'
                      ? 'border-primary bg-primary-lighter/20'
                      : 'border-primary/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'cod'}
                    onChange={() => setPayMethod('cod')}
                    className="mt-1 lg:mt-[0.2vw]"
                  />
                  <span className="font-secondary text-sm lg:text-[0.85vw] text-primary-dark">
                    <span className="font-semibold block">Cash on delivery</span>
                    Available where offered — pay when your order arrives.
                  </span>
                </label>
              </div>
            </section>

            <section className="bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-6 lg:p-[1.5vw] shadow-xs flex flex-col gap-4 lg:gap-[1vw]">
              <h2 className="font-heading text-xl lg:text-[1.3vw] font-bold text-[#2A170F]">Order summary</h2>
              <div className="flex flex-col gap-2 lg:gap-[0.5vw] font-secondary text-sm lg:text-[0.85vw]">
                <div className="flex justify-between">
                  <span className="text-body/70">Subtotal</span>
                  <span className="font-semibold">{formatMoney(displaySubtotal)}</span>
                </div>
                {displayDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon{promoCode ? ` (${promoCode})` : ''}</span>
                    <span>-{formatMoney(displayDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-body/70">Shipping</span>
                  <span className="font-semibold">
                    {displayShipping > 0 ? formatMoney(displayShipping) : 'Free'}
                  </span>
                </div>
                {displayTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-body/70">Tax</span>
                    <span className="font-semibold">{formatMoney(displayTax)}</span>
                  </div>
                )}
                <div className="border-t border-primary/10 pt-3 lg:pt-[0.8vw] mt-1 lg:mt-[0.2vw] flex justify-between items-baseline">
                  <span className="font-heading text-lg lg:text-[1.2vw] font-bold">Total</span>
                  <span className="font-heading text-2xl lg:text-[1.8vw] font-extrabold text-primary">
                    {formatMoney(displayTotal)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-xs lg:text-[0.75vw] text-red-600 font-secondary bg-red-50 rounded-xl lg:rounded-[0.8vw] px-3 lg:px-[0.8vw] py-2 lg:py-[0.5vw]">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={placing}
                onClick={handlePlaceOrder}
                className="w-full py-4 lg:py-[0.9vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs lg:text-[0.75vw] uppercase tracking-[0.15em] hover:bg-primary-dark transition-all disabled:opacity-60 flex items-center justify-center gap-2 lg:gap-[0.4vw] cursor-pointer"
              >
                <Icon
                  icon={payMethod === 'online' ? 'ph:credit-card' : 'ph:truck'}
                  className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]"
                />
                {placing
                  ? payMethod === 'online'
                    ? 'Starting payment…'
                    : 'Placing order…'
                  : payMethod === 'online'
                    ? 'Pay online'
                    : 'Place COD order'}
              </button>

              <Link
                href="/cart"
                className="w-full py-3 lg:py-[0.7vw] rounded-full border border-primary/20 text-center text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider text-primary-dark"
              >
                Back to cart
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
