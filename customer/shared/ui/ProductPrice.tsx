'use client';

import type { Product } from '@/shared/data/productData';
import { useProductPrice } from '@/shared/hooks/useProductPrice';

/** Renders a live FX-converted catalog price. */
export function ProductPrice({
  product,
  className,
}: {
  product: Pick<Product, 'price' | 'basePrice'>;
  className?: string;
}) {
  const priceLabel = useProductPrice(product);
  return <span className={className}>{priceLabel}</span>;
}
