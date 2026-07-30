'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product } from '@/shared/data/productData';
import {
  ApiError,
  addServerWishlistItem,
  fetchServerWishlist,
  formatMoney,
  removeServerWishlistItem,
  syncLocalWishlistToServer,
  wishlistLineToLocal,
} from '@/lib/api';
import { getShopFxSettings, toDisplayAmount } from '@/lib/currency';
import { useAuth } from '@/shared/context/AuthContext';

export interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  artisanName: string;
  artisanLocation: string;
  price: number;
  priceString: string;
  originalPrice?: string;
  discountBadge?: string;
  badge?: string;
  image: string;
  rating: number;
  reviewsCount: number;
  /** Available units; used when moving to cart. */
  stock?: number;
  inStock: boolean;
  onSale?: boolean;
  isNewArrival?: boolean;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product | WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (product: Product | WishlistItem) => boolean;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  totalWishlistItems: number;
  isSynced: boolean;
  refreshFromServer: () => Promise<void>;
}

const LEGACY_DEMO_IDS = new Set([
  'hd-1',
  'hd-2',
  'hd-3',
  'hd-4',
  'hd-wood-elephant',
  'wh-2',
]);

const STORAGE_KEY = 'matina_wishlist';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function parsePrice(priceStr: string): number {
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isWishlistItem(value: Product | WishlistItem): value is WishlistItem {
  return 'priceString' in value && 'artisanName' in value;
}

export function wishlistItemToProduct(item: WishlistItem): Product {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    location: item.artisanLocation,
    price: item.priceString,
    image: item.image,
    subtitle: '',
    description: '',
    originalPrice: item.originalPrice || '',
    discount: item.discountBadge || '',
    medium: '',
    dimensions: '',
    age: '',
    school: '',
    stock: Math.max(0, Math.floor(Number(item.stock ?? (item.inStock ? 1 : 0)))),
    galleryImages: item.image ? [item.image] : [],
    tags: [],
    artisan: {
      name: item.artisanName,
      bio: [],
      image: item.image,
      stats: { yearsOfCraft: 0, itemsCreated: 0, apprentices: 0 },
    },
  };
}

function loadLocalWishlist(): WishlistItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: WishlistItem) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.slug === 'string' &&
          !LEGACY_DEMO_IDS.has(item.id),
      )
      .map((item: WishlistItem) => ({
        ...item,
        image:
          typeof item.image === 'string'
            ? item.image.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/i, '') || item.image
            : '',
      }));
  } catch {
    return [];
  }
}

function mergeWishlists(local: WishlistItem[], server: WishlistItem[]): WishlistItem[] {
  const byId = new Map<string, WishlistItem>();
  for (const item of server) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    // Prefer a usable image if the server row came back without one
    if (!existing.image && item.image) {
      byId.set(item.id, { ...existing, image: item.image });
    }
  }
  return Array.from(byId.values());
}

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded: authLoaded, isLoggedIn } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  const refreshFromServer = useCallback(async () => {
    if (!isLoggedIn) {
      setIsSynced(false);
      return;
    }

    const local = loadLocalWishlist();
    if (local.length > 0) {
      await syncLocalWishlistToServer(local.map((i) => i.id));
    }

    try {
      const lines = await fetchServerWishlist();
      const mapped = lines.map(wishlistLineToLocal);
      setWishlist(mergeWishlists(local, mapped));
      setIsSynced(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setIsSynced(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    setWishlist(loadLocalWishlist());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    void refreshFromServer();
  }, [authLoaded, isLoggedIn, refreshFromServer]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist', e);
    }
  }, [wishlist, isLoaded]);

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id || item.slug === id);
  };

  const addToWishlist = (product: Product | WishlistItem) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === product.id || item.slug === product.slug)) {
        return prev;
      }

      if (isWishlistItem(product)) {
        return [...prev, product];
      }

      const discount = product.discount?.trim() || '';
      const stock = Number(product.stock ?? 0);
      const fx = getShopFxSettings();
      const amount =
        product.basePrice != null && Number.isFinite(product.basePrice)
          ? toDisplayAmount(product.basePrice, fx)
          : parsePrice(product.price);
      const currency =
        fx.currency ||
        (String(fx.region_mode || '').toLowerCase() === 'nepal' ? 'NPR' : 'USD');
      const priceString =
        product.basePrice != null && Number.isFinite(product.basePrice)
          ? formatMoney(amount, currency)
          : product.price;
      const newItem: WishlistItem = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category || 'Handicraft',
        artisanName: product.artisan?.name || 'Artisan',
        artisanLocation: product.location || 'Nepal',
        price: amount,
        priceString,
        originalPrice: product.originalPrice || undefined,
        discountBadge: discount || undefined,
        image: product.image,
        rating: 5,
        reviewsCount: 0,
        stock: Math.max(0, Math.floor(stock) || 0),
        inStock: stock > 0,
        onSale: Boolean(discount),
      };
      return [...prev, newItem];
    });

    if (isSynced) {
      void addServerWishlistItem(product.id).catch(() => undefined);
    }
  };

  const removeFromWishlist = (id: string) => {
    const target = wishlist.find((item) => item.id === id || item.slug === id);
    setWishlist((prev) => prev.filter((item) => item.id !== id && item.slug !== id));
    if (isSynced && target) {
      void removeServerWishlistItem(target.id).catch(() => undefined);
    }
  };

  const toggleWishlist = (product: Product | WishlistItem): boolean => {
    const exists = isInWishlist(product.id) || isInWishlist(product.slug);
    if (exists) {
      removeFromWishlist(product.id);
      if (product.slug) removeFromWishlist(product.slug);
      return false;
    }
    addToWishlist(product);
    return true;
  };

  const clearWishlist = () => {
    if (isSynced) {
      wishlist.forEach((item) => {
        void removeServerWishlistItem(item.id).catch(() => undefined);
      });
    }
    setWishlist([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        totalWishlistItems: wishlist.length,
        isSynced,
        refreshFromServer,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
