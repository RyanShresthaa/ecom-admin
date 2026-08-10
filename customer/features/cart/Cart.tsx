'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useCart } from '@/shared/context/CartContext';
import RelatedProduct from '@/features/products/detail/RelatedProduct';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';
import { useAuth } from '@/shared/context/AuthContext';
import { hasSession } from '@/lib/api';

const Cart: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    discount,
    promoCode,
    applyPromoCode,
    clearPromoCode,
  } = useCart();
  const { formatMoney, settings, regionMode } = useShopLocale();
  const { isLoggedIn, isLoaded } = useAuth();
  const flatShipping = Number(settings.flat_shipping_fee ?? (regionMode === 'nepal' ? 100 : 5.99));
  const freeShippingMin = Number(
    settings.free_shipping_min ?? (regionMode === 'nepal' ? 1000 : 75),
  );
  const afterDiscount = Math.max(0, subtotal - discount);
  const estimatedShipping = afterDiscount >= freeShippingMin ? 0 : flatShipping;
  const estimatedTotal = afterDiscount + estimatedShipping;

  const [inputPromo, setInputPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoOk, setPromoOk] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [apiLoggedIn, setApiLoggedIn] = useState(false);

  const loggedIn = isLoggedIn || apiLoggedIn;

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded) return;
    hasSession().then((ok) => {
      if (!cancelled) setApiLoggedIn(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isLoggedIn]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPromo.trim()) return;
    setApplyingPromo(true);
    const result = await applyPromoCode(inputPromo);
    setPromoOk(result.ok);
    setPromoMessage(result.message);
    setApplyingPromo(false);
  };

  return (
    <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 lg:gap-[1vw] mb-8 lg:mb-[2vw]">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.2vw] font-bold text-[#2A170F] tracking-tight">
              My Cart
            </h1>
            <p className="font-secondary text-sm sm:text-base lg:text-[0.9vw] text-body/70 mt-2 lg:mt-[0.4vw]">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} — all handcrafted in Nepal
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="inline-flex items-center gap-2 lg:gap-[0.4vw] text-xs lg:text-[0.75vw] font-secondary font-medium text-body/60 hover:text-red-600 transition-colors cursor-pointer self-start sm:self-auto py-1"
            >
              <Icon icon="lucide:trash-2" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
              <span>Clear cart</span>
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-12 lg:p-[4vw] text-center border border-primary/10 shadow-xs flex flex-col items-center justify-center my-8 lg:my-[2vw]">
            <div className="w-20 h-20 lg:w-[5vw] lg:h-[5vw] rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mb-6 lg:mb-[1.5vw]">
              <Icon icon="ph:shopping-bag-open-light" className="w-10 h-10 lg:w-[2.5vw] lg:h-[2.5vw]" />
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-[2vw] font-medium text-primary-dark mb-2 lg:mb-[0.5vw]">
              Your cart is empty
            </h2>
            <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70 max-w-md lg:max-w-none mb-8 lg:mb-[2vw]">
              Looks like you haven&apos;t added any handcrafted Nepalese treasures to your cart yet.
            </p>
            <Link
              href="/products"
              className="px-8 lg:px-[2vw] py-4 lg:py-[0.9vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs lg:text-[0.75vw] uppercase tracking-wider hover:bg-primary-dark transition-all duration-300 shadow-md"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          /* Main Cart Content Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">

            {/* Left Column — Product List & Promo */}
            <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-[1.5vw]">

              {/* Table Column Headers (Desktop) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 lg:gap-[1vw] px-6 lg:px-[1.5vw] text-[11px] lg:text-[0.7vw] font-semibold tracking-[0.15em] text-body/50 uppercase font-secondary">
                <div className="col-span-6">PRODUCT</div>
                <div className="col-span-2 text-center">PRICE</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">TOTAL</div>
              </div>

              {/* Cart Items List */}
              <div className="flex flex-col gap-4 lg:gap-[1vw]">
                {cart.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl lg:rounded-[1.5vw] p-4 sm:p-5 lg:p-[1.2vw] border border-primary/10 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col sm:grid sm:grid-cols-12 gap-4 lg:gap-[1vw] items-center"
                    >
                      {/* Product Detail */}
                      <div className="sm:col-span-6 w-full flex items-center gap-4 lg:gap-[1vw]">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-[6vw] lg:h-[6vw] rounded-2xl lg:rounded-[1vw] overflow-hidden bg-[#FAF6F2] shrink-0 border border-primary/10">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, 6vw"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-1 lg:gap-[0.2vw] min-w-0 pr-2">
                          {item.category && (
                            <span className="px-2.5 lg:px-[0.6vw] py-0.5 lg:py-[0.15vw] rounded-full bg-[#F5ECE8] border border-primary/10 text-[10px] lg:text-[0.65vw] font-semibold text-primary w-fit uppercase tracking-wider">
                              {item.category}
                            </span>
                          )}
                          <Link href={`/products/${item.slug}`}>
                            <h3 className="font-heading text-base sm:text-lg lg:text-[1.1vw] font-semibold text-[#2A170F] truncate hover:text-primary transition-colors cursor-pointer">
                              {item.name}
                            </h3>
                          </Link>
                          <p className="text-xs lg:text-[0.75vw] text-body/60 font-secondary truncate">
                            {item.artisanName}, {item.artisanLocation}
                          </p>
                          <div className="flex items-center text-[#c89b5d] text-xs lg:text-[0.75vw] gap-0.5 lg:gap-[0.1vw] mt-0.5 lg:mt-[0.1vw]">
                            {[...Array(item.rating || 5)].map((_, i) => (
                              <Icon key={i} icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.8vw] lg:h-[0.8vw]" />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Row layout helper */}
                      <div className="w-full sm:w-auto flex items-center justify-between sm:contents pt-3 sm:pt-0 border-t sm:border-t-0 border-primary/10">

                        {/* Price */}
                        <div className="sm:col-span-2 text-left sm:text-center flex flex-col items-start sm:items-center justify-center">
                          <span className="font-heading text-base sm:text-lg lg:text-[1.1vw] font-bold text-primary">
                            {formatMoney(item.price)}
                          </span>
                          {item.originalPrice && (
                            <span className="text-xs lg:text-[0.75vw] text-body/40 line-through font-secondary">
                              {item.originalPrice}
                            </span>
                          )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="sm:col-span-2 flex justify-center">
                          <div className="inline-flex items-center bg-[#FAF6F2] border border-primary/15 rounded-full px-2 lg:px-[0.5vw] py-1 lg:py-[0.25vw] gap-2.5 lg:gap-[0.6vw] text-xs lg:text-[0.75vw] font-semibold text-primary-dark">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 lg:w-[1.5vw] lg:h-[1.5vw] rounded-full flex items-center justify-center hover:bg-white text-body/80 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Icon icon="ph:minus" className="w-3 h-3 lg:w-[0.8vw] lg:h-[0.8vw]" />
                            </button>
                            <span className="w-4 lg:w-[1vw] text-center select-none font-secondary text-sm lg:text-[0.85vw] font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={
                                item.stock != null &&
                                Number.isFinite(Number(item.stock)) &&
                                item.quantity >= Number(item.stock)
                              }
                              className="w-6 h-6 lg:w-[1.5vw] lg:h-[1.5vw] rounded-full flex items-center justify-center hover:bg-white text-body/80 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              aria-label="Increase quantity"
                            >
                              <Icon icon="ph:plus" className="w-3 h-3 lg:w-[0.8vw] lg:h-[0.8vw]" />
                            </button>
                          </div>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="sm:col-span-2 text-right flex items-center justify-end gap-3 sm:gap-2 lg:gap-[0.5vw]">
                          <div className="flex flex-col items-end">
                            <span className="font-heading text-base sm:text-lg lg:text-[1.1vw] font-bold text-primary-dark">
                              {formatMoney(lineTotal)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-body/40 hover:text-red-500 transition-colors p-1.5 lg:p-[0.3vw] rounded-full hover:bg-red-50 cursor-pointer ml-1 lg:ml-[0.2vw]"
                            aria-label="Remove product"
                          >
                            <Icon icon="lucide:x" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Promo Code Card */}
              <form
                onSubmit={handleApplyPromo}
                className="bg-white rounded-3xl lg:rounded-[1.5vw] p-3 lg:p-[0.8vw] border border-primary/10 shadow-xs flex items-center gap-3 lg:gap-[0.8vw]"
              >
                <div className="pl-3 lg:pl-[0.8vw] text-body/40">
                  <Icon icon="ph:tag" className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw]" />
                </div>
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={inputPromo}
                  onChange={(e) => setInputPromo(e.target.value)}
                  className="grow bg-transparent text-sm lg:text-[0.8vw] text-primary-dark placeholder-body/40 focus:outline-none font-secondary"
                />
                <button
                  type="submit"
                  disabled={applyingPromo}
                  className="px-6 lg:px-[1.5vw] py-2.5 lg:py-[0.6vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs lg:text-[0.75vw] uppercase tracking-wider hover:bg-primary-dark transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {applyingPromo ? '…' : 'Apply'}
                </button>
              </form>
              {promoMessage && (
                <p
                  className={`text-xs lg:text-[0.75vw] font-secondary px-3 lg:px-[0.8vw] -mt-3 lg:-mt-[0.6vw] ${
                    promoOk ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {promoOk ? '✓ ' : ''}
                  {promoMessage}
                  {promoOk && promoCode ? ` (${promoCode})` : ''}
                </p>
              )}
              {promoCode && (
                <button
                  type="button"
                  onClick={() => {
                    clearPromoCode();
                    setPromoMessage('');
                    setInputPromo('');
                  }}
                  className="text-xs lg:text-[0.75vw] text-body/60 hover:text-red-600 font-secondary px-3 lg:px-[0.8vw] -mt-2 lg:-mt-[0.4vw] self-start"
                >
                  Remove coupon
                </button>
              )}

              {/* Supporting Artisans Banner */}
              <div className="bg-[#F5ECE8]/70 border border-primary/15 rounded-3xl lg:rounded-[1.5vw] p-6 lg:p-[1.5vw] flex items-start gap-4 lg:gap-[1vw] mt-2 lg:mt-[0.5vw]">
                <div className="w-10 h-10 lg:w-[2.5vw] lg:h-[2.5vw] rounded-full bg-white text-primary flex items-center justify-center shrink-0 shadow-xs">
                  <Icon icon="ph:heart-fill" className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw] text-primary" />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-heading text-base lg:text-[1.1vw] font-bold text-primary-dark">
                    You&apos;re supporting real artisans
                  </h4>
                  <p className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] text-body/75 leading-relaxed mt-1 lg:mt-[0.2vw]">
                    Every purchase directly supports the artisan who made your piece. 100% handcrafted in Nepal with fair wages and ethical practices.
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column — Sidebar (Order Summary & Info) */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-[1.5vw]">

              {/* Order Summary Card */}
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-7 lg:p-[1.8vw] border border-primary/10 shadow-xs flex flex-col gap-6 lg:gap-[1.2vw]">
                <h2 className="font-heading text-xl sm:text-2xl lg:text-[1.5vw] font-bold text-[#2A170F]">
                  Order Summary
                </h2>

                <div className="flex flex-col gap-3 lg:gap-[0.8vw] font-secondary text-sm lg:text-[0.85vw]">
                  <div className="flex justify-between items-center text-body/80">
                    <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-primary-dark">{formatMoney(subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-body/80">
                      Shipping
                      {estimatedShipping === 0 && freeShippingMin > 0 ? (
                        <span className="block text-[11px] lg:text-[0.7vw] text-emerald-700/80 mt-0.5 lg:mt-[0.1vw]">
                          Free over {formatMoney(freeShippingMin)}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`font-semibold ${
                        estimatedShipping === 0 ? 'text-emerald-600' : 'text-primary-dark'
                      }`}
                    >
                      {estimatedShipping === 0 ? 'Free' : formatMoney(estimatedShipping)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-body/80">
                        Discount{promoCode ? ` (${promoCode})` : ''}
                      </span>
                      <span className="font-semibold text-red-500">-{formatMoney(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-primary/10 pt-4 lg:pt-[1vw] flex justify-between items-baseline">
                  <span className="font-heading text-lg lg:text-[1.2vw] font-bold text-[#2A170F]">
                    Estimated total
                  </span>
                  <span className="font-heading text-3xl lg:text-[2.2vw] font-extrabold text-primary">
                    {formatMoney(estimatedTotal)}
                  </span>
                </div>
                <p className="font-secondary text-[11px] lg:text-[0.7vw] text-body/50 -mt-3 lg:-mt-[0.6vw]">
                  Tax calculated at checkout. Final shipping confirmed after address.
                </p>

                <div className="flex flex-col gap-3 lg:gap-[0.8vw] pt-2 lg:pt-[0.5vw]">
                  {!loggedIn ? (
                    <div className="rounded-2xl lg:rounded-[1vw] border border-amber-200 bg-amber-50 px-4 lg:px-[1vw] py-3 lg:py-[0.8vw] text-left">
                      <p className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] text-amber-950 leading-relaxed">
                        Sign in is required before checkout. Guest checkout is disabled — your cart
                        stays saved here until you log in.
                      </p>
                    </div>
                  ) : null}
                  {loggedIn ? (
                    <Link
                      href="/checkout"
                      className="w-full py-4 lg:py-[0.9vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs sm:text-sm lg:text-[0.8vw] uppercase tracking-[0.15em] hover:bg-primary-dark transition-all duration-300 flex items-center justify-center gap-2 lg:gap-[0.4vw] cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      <Icon icon="ph:lock-key-fill" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                      <span>Proceed to Checkout</span>
                    </Link>
                  ) : (
                    <Link
                      href="/login?next=/cart"
                      className="w-full py-4 lg:py-[0.9vw] rounded-full bg-[#8C523A] text-white font-semibold text-xs sm:text-sm lg:text-[0.8vw] uppercase tracking-[0.15em] hover:bg-primary-dark transition-all duration-300 flex items-center justify-center gap-2 lg:gap-[0.4vw] cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      <Icon icon="ph:lock-key-fill" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                      <span>Sign in to checkout</span>
                    </Link>
                  )}

                  <Link
                    href="/products"
                    className="w-full py-3.5 lg:py-[0.8vw] rounded-full border border-primary/25 text-primary-dark font-semibold text-xs lg:text-[0.75vw] uppercase tracking-[0.12em] hover:bg-primary-lighter/30 transition-all duration-300 flex items-center justify-center gap-2 lg:gap-[0.4vw] cursor-pointer text-center"
                  >
                    <Icon icon="ph:shopping-bag-simple" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                    <span>Continue Shopping</span>
                  </Link>
                </div>

                {/* Trust Footer */}
                <div className="flex items-center justify-center gap-6 lg:gap-[1.5vw] pt-2 lg:pt-[0.5vw] border-t border-primary/10 text-body/60 text-xs lg:text-[0.75vw] font-secondary">
                  <div className="flex items-center gap-1.5 lg:gap-[0.3vw]">
                    <Icon icon="ph:shield-check" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-emerald-600" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-[0.3vw]">
                    <Icon icon="ph:arrow-counter-clockwise" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary" />
                    <span>30-day returns</span>
                  </div>
                </div>
              </div>

              {/* Delivery Estimate Card */}
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 lg:p-[1.5vw] border border-primary/10 shadow-xs flex flex-col gap-4 lg:gap-[1vw]">
                <h3 className="font-heading text-base lg:text-[1.1vw] font-bold text-primary-dark">
                  Delivery Estimate
                </h3>
                <div className="flex flex-col gap-3 lg:gap-[0.8vw] font-secondary text-xs lg:text-[0.75vw]">
                  <div className="flex items-center gap-3 lg:gap-[0.8vw] p-3 lg:p-[0.8vw] rounded-2xl lg:rounded-[1vw] bg-[#FAF6F2] border border-primary/10">
                    <div className="w-8 h-8 lg:w-[2vw] lg:h-[2vw] rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center shrink-0">
                      <Icon icon="ph:truck" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary-dark">Standard Shipping</span>
                      <span className="text-body/60 mt-0.5 lg:mt-[0.1vw]">
                        7–14 business days ·{' '}
                        {flatShipping > 0 ? formatMoney(flatShipping) : 'Free'}
                        {freeShippingMin > 0
                          ? ` · free over ${formatMoney(freeShippingMin)}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accepted Payments Card */}
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 lg:p-[1.5vw] border border-primary/10 shadow-xs flex flex-col gap-4 lg:gap-[1vw]">
                <h3 className="font-heading text-base lg:text-[1.1vw] font-bold text-primary-dark">
                  Accepted Payments
                </h3>
                <div className="flex flex-wrap items-center gap-2 lg:gap-[0.5vw] text-xs lg:text-[0.75vw] font-mono text-body/70">
                  <div className="px-3 lg:px-[0.8vw] py-1.5 lg:py-[0.4vw] rounded-xl lg:rounded-[0.8vw] bg-[#FAF6F2] border border-primary/10 flex items-center gap-1.5 lg:gap-[0.4vw] uppercase tracking-wider font-semibold text-[11px] lg:text-[0.7vw]">
                    <Icon icon="ph:credit-card" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary" />
                    Card
                  </div>
                  <div className="px-3 lg:px-[0.8vw] py-1.5 lg:py-[0.4vw] rounded-xl lg:rounded-[0.8vw] bg-[#FAF6F2] border border-primary/10 uppercase tracking-wider font-semibold text-[11px] lg:text-[0.7vw]">
                    Stripe
                  </div>
                  <div className="px-3 lg:px-[0.8vw] py-1.5 lg:py-[0.4vw] rounded-xl lg:rounded-[0.8vw] bg-[#FAF6F2] border border-primary/10 uppercase tracking-wider font-semibold text-[11px] lg:text-[0.7vw]">
                    COD
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* You Might Also Love Recommendations */}
        <RelatedProduct />

      </div>
    </div>
  );
};

export default Cart;