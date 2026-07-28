'use client';

import { useShopLocale } from '@/shared/context/ShopLocaleContext';
import type { Product } from '@/shared/data/productData';

/**
 * Live catalog → display currency formatting.
 * Prefer `basePrice` so prices update when region/FX settings load or change.
 */
export function useProductPrice(product: Pick<Product, 'price' | 'basePrice'>): string {
  const { formatCatalogPrice } = useShopLocale();
  if (product.basePrice != null && Number.isFinite(product.basePrice)) {
    return formatCatalogPrice(product.basePrice);
  }
  return product.price;
}
