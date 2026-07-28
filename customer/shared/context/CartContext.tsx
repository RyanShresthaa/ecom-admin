'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product } from '@/shared/data/productData';
import {
  ApiError,
  addServerCartItem,
  cartLineToLocal,
  computeCouponDiscount,
  fetchServerCart,
  formatMoney,
  hasSession,
  removeServerCartItem,
  syncLocalCartToServer,
  updateServerCartItem,
  validateCoupon,
  type ApiCoupon,
} from '@/lib/api';
import { getShopFxSettings, toDisplayAmount } from '@/lib/currency';

export interface CartItem {
  id: string;
  cartLineId?: string;
  name: string;
  slug: string;
  category: string;
  artisanName: string;
  artisanLocation: string;
  price: number;
  priceString: string;
  originalPrice?: string;
  originalPriceNum?: number;
  image: string;
  quantity: number;
  rating?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  promoCode: string;
  applyPromoCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  clearPromoCode: () => void;
  orderTotal: number;
  isSynced: boolean;
  refreshFromServer: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'matina_cart';
const PROMO_KEY = 'matina_cart_promo';

function parsePrice(priceStr: string): number {
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Resolve display-currency unit price from a catalog product. */
function resolveDisplayPrice(product: Product): { amount: number; label: string } {
  const fx = getShopFxSettings();
  if (product.basePrice != null && Number.isFinite(product.basePrice)) {
    const amount = toDisplayAmount(product.basePrice, fx);
    const currency =
      fx.currency ||
      (String(fx.region_mode || '').toLowerCase() === 'nepal' ? 'NPR' : 'USD');
    return { amount, label: formatMoney(amount, currency) };
  }
  const amount = parsePrice(product.price);
  return { amount, label: product.price };
}

function loadLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [coupon, setCoupon] = useState<ApiCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const persistPromo = useCallback((code: string, nextCoupon: ApiCoupon | null, amount: number) => {
    try {
      localStorage.setItem(
        PROMO_KEY,
        JSON.stringify({ code, coupon: nextCoupon, discount: amount }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const refreshFromServer = useCallback(async () => {
    const loggedIn = await hasSession();
    if (!loggedIn) {
      setIsSynced(false);
      return;
    }

    const local = loadLocalCart();
    if (local.length > 0) {
      await syncLocalCartToServer(local.map((i) => ({ id: i.id, quantity: i.quantity })));
    }

    try {
      const lines = await fetchServerCart();
      const mapped = lines.map(cartLineToLocal);
      setCart(mapped);
      setIsSynced(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setIsSynced(false);
      }
    }
  }, []);

  useEffect(() => {
    const local = loadLocalCart();
    setCart(local);

    try {
      const savedPromo = localStorage.getItem(PROMO_KEY);
      if (savedPromo) {
        const parsed = JSON.parse(savedPromo) as {
          code?: string;
          coupon?: ApiCoupon | null;
          discount?: number;
        };
        if (parsed.code && parsed.coupon) {
          setPromoCode(parsed.code);
          setCoupon(parsed.coupon);
          setDiscountAmount(Number(parsed.discount) || 0);
        }
      }
    } catch {
      /* ignore */
    }

    setIsLoaded(true);
    void refreshFromServer();
  }, [refreshFromServer]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [cart, isLoaded]);

  // Recompute discount when cart or coupon changes
  useEffect(() => {
    if (!coupon) {
      setDiscountAmount(0);
      return;
    }
    const sub = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      const amount = computeCouponDiscount(sub, coupon);
      setDiscountAmount(amount);
      persistPromo(promoCode, coupon, amount);
    } catch {
      setDiscountAmount(0);
    }
  }, [cart, coupon, promoCode, persistPromo]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id || item.slug === product.slug,
      );
      const { amount: numericPrice, label: priceString } = resolveDisplayPrice(product);
      let next: CartItem[];

      if (existingIndex > -1) {
        next = [...prevCart];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
      } else {
        next = [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            slug: product.slug,
            category: product.category || 'Handicraft',
            artisanName: product.artisan?.name || 'Artisan',
            artisanLocation: product.location || 'Nepal',
            price: numericPrice,
            priceString,
            originalPrice: product.originalPrice,
            image: product.image,
            quantity,
            rating: 5,
          },
        ];
      }
      return next;
    });

    if (isSynced) {
      void addServerCartItem(product.id, quantity).catch(() => undefined);
    }
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const target = prev.find((item) => item.id === id);
      if (isSynced && target?.cartLineId) {
        void removeServerCartItem(target.cartLineId).catch(() => undefined);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) {
            if (isSynced && item.cartLineId) {
              void removeServerCartItem(item.cartLineId).catch(() => undefined);
            }
            return null;
          }
          if (isSynced && item.cartLineId) {
            void updateServerCartItem(item.cartLineId, newQty).catch(() => undefined);
          } else if (isSynced) {
            void addServerCartItem(item.id, newQty).catch(() => undefined);
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const clearCart = () => {
    if (isSynced) {
      cart.forEach((item) => {
        if (item.cartLineId) {
          void removeServerCartItem(item.cartLineId).catch(() => undefined);
        }
      });
    }
    setCart([]);
  };

  const applyPromoCode = async (code: string): Promise<{ ok: boolean; message: string }> => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, message: 'Enter a promo code' };

    try {
      const validated = await validateCoupon(clean);
      const sub = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const amount = computeCouponDiscount(sub, validated);
      setPromoCode(validated.code || clean);
      setCoupon(validated);
      setDiscountAmount(amount);
      persistPromo(validated.code || clean, validated, amount);
      return { ok: true, message: `Coupon ${validated.code} applied` };
    } catch (err) {
      setPromoCode('');
      setCoupon(null);
      setDiscountAmount(0);
      persistPromo('', null, 0);
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Invalid or expired coupon',
      };
    }
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setCoupon(null);
    setDiscountAmount(0);
    persistPromo('', null, 0);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 0 ? Math.min(discountAmount, subtotal) : 0;
  const orderTotal = Math.max(0, subtotal - discount);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        discount,
        promoCode,
        applyPromoCode,
        clearPromoCode,
        orderTotal,
        isSynced,
        refreshFromServer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
