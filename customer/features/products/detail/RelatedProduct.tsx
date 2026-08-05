'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/shared/data/productData';
import ProductCard from '@/shared/ui/ProductCard';
import { fetchProducts } from '@/lib/api';
import { mapApiProducts } from '@/lib/mapProduct';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';

interface RelatedProductProps {
  currentProduct?: Product;
  products?: Product[];
  title?: string;
  /** Product ids/slugs to skip (e.g. already on wishlist). */
  excludeIds?: string[];
}

export default function RelatedProduct({
  currentProduct,
  products,
  title = 'You Might Also Love',
  excludeIds = [],
}: RelatedProductProps) {
  const { settings, loading: localeLoading } = useShopLocale();
  const [fetched, setFetched] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!products || products.length === 0);

  useEffect(() => {
    if (products && products.length > 0) {
      setLoading(false);
      return;
    }
    if (localeLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchProducts(100);
        if (!cancelled) setFetched(mapApiProducts(rows, settings));
      } catch {
        if (!cancelled) setFetched([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [products, localeLoading, settings]);

  const exclude = new Set([
    ...excludeIds,
    ...(currentProduct ? [currentProduct.id, currentProduct.slug] : []),
  ]);

  const source = products && products.length > 0 ? products : fetched;

  let relatedProducts: Product[];
  if (products && products.length > 0) {
    relatedProducts = products.slice(0, 3);
  } else if (currentProduct) {
    const sameCategory = source.filter(
      (p) => p.category === currentProduct.category && !exclude.has(p.id) && !exclude.has(p.slug),
    );
    const fill = source.filter(
      (p) =>
        !exclude.has(p.id) &&
        !exclude.has(p.slug) &&
        !sameCategory.some((r) => r.id === p.id),
    );
    relatedProducts = [...sameCategory, ...fill].slice(0, 3);
  } else {
    relatedProducts = source
      .filter((p) => !exclude.has(p.id) && !exclude.has(p.slug))
      .slice(0, 3);
  }

  const categoryName = currentProduct?.category ?? 'Products';

  return (
    <section className="w-full mt-16 sm:mt-24 lg:mt-[5vw] pt-16 lg:pt-[3vw] border-t border-primary/10 select-none">
      <div className="flex justify-between items-end mb-8 sm:mb-10 lg:mb-[2vw] text-left">
        <h2 className="font-heading text-2xl sm:text-3xl lg:text-[2.2vw] font-normal leading-tight text-primary-dark">
          {title}
        </h2>
        <Link
          href={
            currentProduct
              ? `/products?category=${encodeURIComponent(currentProduct.category)}`
              : '/products'
          }
          className="inline-flex items-center gap-1.5 lg:gap-[0.4vw] font-secondary text-xs sm:text-sm lg:text-[0.75vw] font-semibold text-primary hover:text-primary-dark transition-colors group cursor-pointer"
        >
          <span>View All {categoryName}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>

      {loading && (
        <p className="font-secondary text-sm lg:text-[0.85vw] text-primary py-8 lg:py-[2vw] text-center">
          Loading recommendations…
        </p>
      )}

      {!loading && relatedProducts.length === 0 && (
        <p className="font-secondary text-sm lg:text-[0.85vw] text-body/60 py-8 lg:py-[2vw] text-center">
          No recommendations yet.{' '}
          <Link href="/products" className="text-primary hover:underline">
            Browse the catalog
          </Link>
        </p>
      )}

      {!loading && relatedProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-[2vw]">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
