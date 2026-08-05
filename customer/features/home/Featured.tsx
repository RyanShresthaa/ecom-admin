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
  const { addToCart, cart } = useCart();
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
      className="w-full py-16 sm:py-24 md:py-28 lg:py-[6vw] flex items-center justify-center select-none"
    >
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none flex flex-col items-center">
        <div
          ref={headerRef}
          className="text-center w-full lg:max-w-none mx-auto mb-12 sm:mb-16 lg:mb-[3vw] flex flex-col items-center"
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal text-[#2A170F] leading-tight lg:leading-[1.1] tracking-tight">
            <span className="text-[#c89b5d] mr-2 lg:mr-[0.4vw]">Artisan</span>Collection
          </h2>
          <p className="text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-[#664132]/90 font-secondary mt-4 lg:mt-[0.8vw] w-full lg:max-w-none">
            Hand-selected pieces from our most celebrated craftspeople. Each item
            represents years of dedication and inherited skill.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-[1.5vw] w-full"
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
              const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
              const inCartQty =
                cart.find((item) => item.id === product.id || item.slug === product.slug)
                  ?.quantity || 0;
              const canAdd = stock > 0 && inCartQty < stock;
              return (
                <div
                  key={product.id}
                  className="group flex flex-col p-5 lg:p-[1.2vw] rounded-[24px] lg:rounded-[1.2vw] bg-[#F5ECE8]/40 border border-primary/5 hover:shadow-[0_12px_32px_rgba(140,82,58,0.04)] transition-all duration-300"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative aspect-square w-full rounded-2xl lg:rounded-[0.9vw] overflow-hidden bg-white border border-primary/5 flex items-center justify-center"
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

                  <div className="flex justify-between items-start w-full mt-4 lg:mt-[0.8vw]">
                    <div className="flex flex-col gap-1 lg:gap-[0.2vw] items-start min-w-0 pr-2">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-heading text-[13px] sm:text-sm lg:text-[0.85vw] font-semibold text-[#2A170F] leading-tight lg:leading-[1.2] hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1 text-[10px] lg:text-[0.65vw] mt-0.5">
                        <span className="text-body/60 font-secondary uppercase tracking-wider">
                          Handmade in Nepal
                        </span>
                      </div>

                      <span className="text-[10px] lg:text-[0.65vw] text-body/60 font-secondary mt-0.5 line-clamp-1">
                        {product.subtitle || `${product.location} / ${product.category}`}
                      </span>
                    </div>

                    <ProductPrice
                      product={product}
                      className="text-sm sm:text-base lg:text-[0.95vw] font-semibold text-[#2A170F] font-secondary mt-0.5 shrink-0"
                    />
                  </div>

                  <div className="flex items-center gap-2 lg:gap-[0.5vw] w-full mt-5 lg:mt-[1vw]">
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={() => {
                        if (canAdd) addToCart(product, 1);
                      }}
                      className="flex-1 bg-primary text-white text-[10px] sm:text-[11px] lg:text-[0.7vw] font-semibold uppercase tracking-[0.15em] py-2.5 lg:py-[0.6vw] rounded-full hover:bg-primary-dark transition-all duration-300 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {stock < 1 ? 'Out of Stock' : canAdd ? 'Add to Cart' : 'Max in Cart'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full border border-primary/10 flex items-center justify-center text-[#2A170F] hover:bg-[#FAF6F2] hover:text-primary transition-all duration-300 cursor-pointer"
                      aria-label="Add to wishlist"
                    >
                      <Icon
                        icon={wishlisted ? 'mdi:heart' : 'lucide:heart'}
                        className={`w-4 h-4 lg:w-[0.9vw] lg:h-[0.9vw] ${wishlisted ? 'text-primary' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <Link
          href="/products"
          className="group inline-flex items-center gap-2 lg:gap-[0.5vw] text-[10px] sm:text-[11px] lg:text-[0.75vw] font-semibold uppercase tracking-[0.2em] text-[#2A170F] hover:text-primary transition-colors duration-300 mt-12 sm:mt-16 lg:mt-[3vw] border-b border-current pb-0.5 lg:pb-[0.1vw]"
        >
          <span>View All Pieces</span>
          <Icon
            icon="ph:arrow-right"
            className="w-3.5 h-3.5 lg:w-[0.8vw] lg:h-[0.8vw] transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
};

export default Featured;
