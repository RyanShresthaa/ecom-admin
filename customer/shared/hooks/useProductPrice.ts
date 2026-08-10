'use client';

import { useShopLocale } from '@/shared/context/ShopLocaleContext';
import { unitPriceAfterDiscount } from '@/lib/currency';
import type { Product } from '@/shared/data/productData';

/**
 * Live catalog → display currency formatting (after product % discount).
 * Prefer `basePrice` so prices update when region/FX settings load or change.
 */
export function useProductPrice(
  product: Pick<Product, 'price' | 'basePrice' | 'discountPercent'>,
): string {
  const { formatCatalogPrice } = useShopLocale();
  if (product.basePrice != null && Number.isFinite(product.basePrice)) {
    return formatCatalogPrice(
      unitPriceAfterDiscount(product.basePrice, Number(product.discountPercent) || 0),
    );
  }
  return product.price;
}
