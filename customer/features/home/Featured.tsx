'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fetchProducts } from '@/lib/api';
import { mapApiProducts } from '@/lib/mapProduct';
import type { Product } from '@/shared/data/productData';
import { useCart } from '@/shared/context/CartContext';
import { useWishlist } from '@/shared/context/WishlistContext';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';
import { ProductPrice } from '@/shared/ui/ProductPrice';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const Featured = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { settings, loading: localeLoading } = useShopLocale();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localeLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchProducts(100);
        if (!cancelled) {
          setProducts(mapApiProducts(rows, settings).slice(0, 4));
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localeLoading, settings]);

  return (
    <section
      ref={containerRef}
      className="w-full py-16 sm:py-24 md:py-28 flex items-center justify-center select-none"
    >
      <div className="container-custom max-w-6xl px-4 flex flex-col items-center">
        <div
          ref={headerRef}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 flex flex-col items-center"
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal text-[#2A170F] leading-tight tracking-tight">
            <span className="text-[#c89b5d] mr-2">Artisan</span>Collection
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[#664132]/90 font-secondary mt-4">
            Hand-selected pieces from our most celebrated craftspeople. Each item
            represents years of dedication and inherited skill.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
        >
          {loading && (
            <div className="col-span-full py-12 text-center font-secondary text-sm text-primary">
              Loading products…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center gap-4 bg-white rounded-3xl border border-primary/10 px-6">
              <p className="font-heading text-xl text-[#2A170F]">No featured pieces yet</p>
              <p className="font-secondary text-sm text-body/70">Browse the shop for handmade crafts.</p>
              <Link
                href="/products"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary hover:text-primary-dark"
              >
                Browse catalog
              </Link>
            </div>
          )}

          {!loading &&
            products.map((product) => {
              const wishlisted = isInWishlist(product.id) || isInWishlist(product.slug);
              return (
                <div
                  key={product.id}
                  className="group flex flex-col p-5 rounded-[24px] bg-[#F5ECE8]/40 border border-primary/5 hover:shadow-[0_12px_32px_rgba(140,82,58,0.04)] transition-all duration-300"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-primary/5 flex items-center justify-center"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-primary/40">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="flex justify-between items-start w-full mt-4">
                    <div className="flex flex-col gap-1 items-start min-w-0 pr-2">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-heading text-[13px] sm:text-sm font-semibold text-[#2A170F] leading-tight hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1 text-[10px] mt-0.5">
                        <span className="text-body/60 font-secondary uppercase tracking-wider">
                          Handmade in Nepal
                        </span>
                      </div>

                      <span className="text-[10px] text-body/60 font-secondary mt-0.5 line-clamp-1">
                        {product.subtitle || `${product.location} / ${product.category}`}
                      </span>
                    </div>

                    <ProductPrice
                      product={product}
                      className="text-sm sm:text-base font-semibold text-[#2A170F] font-secondary mt-0.5 shrink-0"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full mt-5">
                    <button
                      type="button"
                      onClick={() => addToCart(product, 1)}
                      className="flex-1 bg-primary text-white text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] py-2.5 rounded-full hover:bg-primary-dark transition-all duration-300 active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      className="w-9 h-9 rounded-full border border-primary/10 flex items-center justify-center text-[#2A170F] hover:bg-[#FAF6F2] hover:text-primary transition-all duration-300 cursor-pointer"
                      aria-label="Add to wishlist"
                    >
                      <Icon
                        icon={wishlisted ? 'mdi:heart' : 'lucide:heart'}
                        className={`w-4 h-4 ${wishlisted ? 'text-primary' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <Link
          href="/products"
          className="group inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2A170F] hover:text-primary transition-colors duration-300 mt-12 sm:mt-16 border-b border-current pb-0.5"
        >
          <span>View All Pieces</span>
          <Icon
            icon="ph:arrow-right"
            className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
};

export default Featured;
