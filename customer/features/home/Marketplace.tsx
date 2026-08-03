'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fetchProducts } from '@/lib/api';
import { mapApiProducts } from '@/lib/mapProduct';
import type { Product } from '@/shared/data/productData';
import { ProductPrice } from '@/shared/ui/ProductPrice';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const ALL = 'ALL CRAFTS';

const Marketplace = () => {
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, loading: localeLoading } = useShopLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localeLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchProducts(100);
        if (!cancelled) setProducts(mapApiProducts(rows, settings));
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

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return [ALL, ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === ALL) {
      // After Featured (0–3) and Collection (4–7)
      return products.slice(8, 16);
    }
    return products.filter((p) => p.category === activeCategory).slice(0, 8);
  }, [products, activeCategory]);

  useEffect(() => {
    if (filteredProducts.length === 0) return;

    const ctx = gsap.context(() => {
      const imageContainers = containerRef.current?.querySelectorAll(
        '.marketplace-image-container'
      );
      if (imageContainers) {
        imageContainers.forEach((container) => {
          const wrapper = container.querySelector('.marketplace-image-wrapper');
          if (wrapper) {
            gsap.fromTo(
              wrapper,
              { yPercent: -8 },
              {
                yPercent: 8,
                ease: 'none',
                scrollTrigger: {
                  trigger: container,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                },
              }
            );
          }
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [activeCategory, filteredProducts]);

  return (
    <section
      ref={containerRef}
      className="w-full bg-[#FAF6F2] py-20 md:py-28 select-none"
    >
      <div className="container-custom px-4">
        <div
          ref={headerRef}
          className="text-center mx-auto mb-12 md:mb-16 flex flex-col items-center"
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#9E7D6F] mb-4 block">
            SUSTAINABLE & FAIR TRADE
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-[42px] font-normal text-[#2A170F] leading-tight tracking-tight mb-8">
            Artisan Marketplace
          </h2>

          <div className="w-full relative border-b border-primary/10 pb-0.5">
            <div className="flex items-center justify-start md:justify-center gap-6 md:gap-8 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] pb-3 transition-all duration-300 relative cursor-pointer ${
                    activeCategory === cat
                      ? 'text-[#2A170F] font-bold'
                      : 'text-[#9E7D6F] hover:text-[#2A170F]'
                  }`}
                >
                  {cat}
                  {activeCategory === cat && (
                    <span className="absolute -bottom-px left-0 w-full h-[2px] bg-[#2A170F] z-10" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 mx-auto"
        >
          {loading && (
            <div className="col-span-full py-12 text-center font-secondary text-sm text-primary">
              Loading products…
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center gap-4">
              <p className="font-secondary text-sm text-body/70">
                No products in this category yet.
              </p>
              <Link
                href="/products"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary hover:text-primary-dark"
              >
                Browse catalog
              </Link>
            </div>
          )}

          {!loading &&
            filteredProducts.map((product) => (
              <div key={product.id} className="flex flex-col items-center group">
                <Link
                  href={`/products/${product.slug}`}
                  className="marketplace-image-container relative aspect-square w-full overflow-hidden border border-[#E6D5C3]/30 hover:border-[#8C523A]/20 transition-all duration-500 flex items-center justify-center"
                >
                  <div className="marketplace-image-wrapper absolute w-full h-[120%] top-[-10%]">
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
                  </div>
                </Link>

                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-heading text-[17px] font-normal text-[#2A170F] text-center mt-5 mb-1 select-none hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>

                <ProductPrice
                  product={product}
                  className="font-secondary text-xs font-semibold text-[#9E7D6F] text-center mb-4 select-none"
                />

                <div className="self-center">
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative inline-flex items-center justify-center px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] font-primary rounded-full transition-all duration-300 cursor-pointer bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            ))}
        </div>

        <div className="flex justify-center mt-16 md:mt-20">
          <Link
            href="/products"
            className="relative inline-flex items-center justify-center px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] font-primary rounded-full transition-all duration-300 cursor-pointer bg-primary text-white border-2 border-primary hover:bg-primary-dark hover:border-primary-dark shadow-[0_4px_16px_rgba(140,82,58,0.2)]"
          >
            Explore the Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Marketplace;
