'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { Product } from '@/shared/data/productData';
import {
  ApiError,
  addServerCartItem,
  cartLineToLocal,
  computeCouponDiscount,
  fetchServerCart,
  formatMoney,
  removeServerCartItem,
  syncLocalCartToServer,
  updateServerCartItem,
  validateCoupon,
  type ApiCoupon,
} from '@/lib/api';
import { getShopFxSettings, toDisplayAmount, unitPriceAfterDiscount } from '@/lib/currency';
import { useAuth } from '@/shared/context/AuthContext';

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
  /** Available inventory; used to cap cart qty. */
  stock?: number;
  rating?: number;
}

interface CartContextType {
  cart: CartItem[];
  /** Returns false if nothing was added (out of stock / already at max). */
  addToCart: (product: Product, quantity?: number) => boolean;
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
const OWNER_KEY = 'matina_cart_owner';

function getCartOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function setCartOwner(owner: string | null) {
  try {
    if (!owner) localStorage.removeItem(OWNER_KEY);
    else localStorage.setItem(OWNER_KEY, owner);
  } catch {
    /* ignore */
  }
}

function clearLocalCartStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROMO_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}

function parsePrice(priceStr: string): number {
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStock(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : undefined;
}

/** Resolve display-currency unit price from a catalog product (after product % discount). */
function resolveDisplayPrice(product: Product): { amount: number; label: string } {
  const fx = getShopFxSettings();
  if (product.basePrice != null && Number.isFinite(product.basePrice)) {
    const saleBase = unitPriceAfterDiscount(
      product.basePrice,
      Number(product.discountPercent) || 0,
    );
    const amount = toDisplayAmount(saleBase, fx);
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
  const { isLoaded: authLoaded, isLoggedIn, user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [coupon, setCoupon] = useState<ApiCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const wasLoggedInRef = useRef(false);
  const skipPersistRef = useRef(false);

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

  const resetLocalCartState = useCallback(() => {
    // Prevent the persist effect from re-writing the old cart as a "guest" cart
    skipPersistRef.current = true;
    clearLocalCartStorage();
    setCart([]);
    setPromoCode('');
    setCoupon(null);
    setDiscountAmount(0);
    setIsSynced(false);
  }, []);

  const refreshFromServer = useCallback(async () => {
    if (!isLoggedIn) {
      setIsSynced(false);
      return;
    }

    // Only merge a true guest cart. Never re-attach another account's leftovers.
    const owner = getCartOwner();
    const local = loadLocalCart();
    if (owner === 'guest' && local.length > 0) {
      await syncLocalCartToServer(local.map((i) => ({ id: i.id, quantity: i.quantity })));
    }

    try {
      const lines = await fetchServerCart();
      const mapped = lines.map(cartLineToLocal);
      setCart(mapped);
      setCartOwner(user?.id != null ? String(user.id) : 'user');
      setIsSynced(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setIsSynced(false);
      }
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    // Stale carts tagged to a previous user must not load for guests / next sessions
    const owner = getCartOwner();
    if (owner && owner !== 'guest') {
      clearLocalCartStorage();
      setCart([]);
    } else {
      setCart(loadLocalCart());
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
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (isLoggedIn) {
      wasLoggedInRef.current = true;
      void refreshFromServer();
      return;
    }

    // Logout / account delete / mid-login session wipe → drop device cart
    if (wasLoggedInRef.current) {
      wasLoggedInRef.current = false;
      resetLocalCartState();
      return;
    }

    setIsSynced(false);
  }, [authLoaded, isLoggedIn, refreshFromServer, resetLocalCartState]);

  useEffect(() => {
    if (!isLoaded) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      clearLocalCartStorage();
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      if (!isLoggedIn) {
        setCartOwner(cart.length > 0 ? 'guest' : null);
      } else if (user?.id != null) {
        setCartOwner(String(user.id));
      }
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [cart, isLoaded, isLoggedIn, user?.id]);

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

  const addToCart = (product: Product, quantity = 1): boolean => {
    const stock = normalizeStock(product.stock);
    if (stock !== undefined && stock < 1) {
      return false;
    }

    const requested = Math.max(1, Math.floor(Number(quantity) || 1));
    let qtyAdded = 0;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id || item.slug === product.slug,
      );
      const currentQty = existingIndex > -1 ? prevCart[existingIndex].quantity : 0;
      const room =
        stock === undefined ? requested : Math.max(0, stock - currentQty);
      qtyAdded = Math.min(requested, room);
      if (qtyAdded < 1) {
        return prevCart;
      }

      const { amount: numericPrice, label: priceString } = resolveDisplayPrice(product);

      if (existingIndex > -1) {
        const next = [...prevCart];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: currentQty + qtyAdded,
          stock: stock ?? next[existingIndex].stock,
        };
        return next;
      }

      return [
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
          quantity: qtyAdded,
          stock,
          rating: 5,
        },
      ];
    });

    if (qtyAdded > 0 && isSynced) {
      void addServerCartItem(product.id, qtyAdded).catch(() => {
        void refreshFromServer();
      });
    }

    return qtyAdded > 0;
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
          const stock = normalizeStock(item.stock);
          let newQty = item.quantity + delta;
          if (delta > 0 && stock !== undefined) {
            if (stock < 1 || item.quantity >= stock) {
              return item;
            }
            newQty = Math.min(newQty, stock);
          }
          if (newQty <= 0) {
            if (isSynced && item.cartLineId) {
              void removeServerCartItem(item.cartLineId).catch(() => undefined);
            }
            return null;
          }
          if (newQty === item.quantity) {
            return item;
          }
          if (isSynced && item.cartLineId) {
            void updateServerCartItem(item.cartLineId, newQty).catch(() => {
              void refreshFromServer();
            });
          } else if (isSynced) {
            void addServerCartItem(item.id, newQty).catch(() => {
              void refreshFromServer();
            });
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
