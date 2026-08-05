'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextReveal } from '@/shared/ui/TextReveal';
import Button from '@/shared/ui/Button';
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

const Collection = () => {
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
          // Next 4 after Featured (which uses 0–3)
          setProducts(mapApiProducts(rows, settings).slice(4, 8));
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

  useEffect(() => {
    const headerEl = headerRef.current;
    const gridEl = gridRef.current;
    if (!headerEl || !gridEl || products.length === 0) return;

    const ctx = gsap.context(() => {
      const imageContainers = containerRef.current?.querySelectorAll(
        '.collection-image-container'
      );
      if (imageContainers) {
        imageContainers.forEach((container) => {
          const wrapper = container.querySelector('.collection-image-wrapper');
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
  }, [products]);

  return (
    <section
      ref={containerRef}
      className="w-full bg-[#FAF6F2] py-20 md:py-28 lg:py-[6vw] select-none"
    >
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none">
        <div
          ref={headerRef}
          className="text-center w-full lg:max-w-none mx-auto mb-16 md:mb-20 lg:mb-[3.5vw] flex flex-col items-center"
        >
          <span className="text-[10px] sm:text-[11px] lg:text-[0.75vw] font-bold uppercase tracking-[0.25em] text-[#9E7D6F] mb-4 lg:mb-[0.8vw] block">
            CURATED BY US
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-[42px] lg:text-[3.2vw] font-normal text-[#2A170F] leading-tight lg:leading-[1.1] tracking-tight">
            Matina Crafts Collection
          </h2>
          <TextReveal className="text-xs sm:text-[14px] lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-[#664132] font-secondary mt-6 lg:mt-[1vw] w-full lg:max-w-none">
            A selection of our most loved artisanal pieces, bringing together
            timeless elegance and everyday utility. From hand-spun paper to
            intricately carved decor, these curations represent the diverse heart
            of Nepali craft.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-[2vw] w-full"
        >
          {loading && (
            <div className="col-span-full py-12 text-center font-secondary text-sm text-primary">
              Loading products…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center gap-4 bg-white rounded-3xl border border-primary/10 px-6">
              <p className="font-heading text-xl text-[#2A170F]">Collection coming soon</p>
              <p className="font-secondary text-sm text-body/70">Check the full catalog for new arrivals.</p>
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
              <div key={product.id} className="flex flex-col items-center w-full">
                <Link
                  href={`/products/${product.slug}`}
                  className="collection-image-container relative aspect-4/5 w-full bg-[#FAF8F5] overflow-hidden border border-[#E6D5C3]/30 hover:border-[#8C523A]/20 transition-all duration-500 group flex items-center justify-center rounded-2xl lg:rounded-[1.2vw]"
                >
                  <div className="collection-image-wrapper absolute w-full h-[120%] top-[-10%] flex items-center justify-center p-6 sm:p-8 lg:p-[2vw]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105"
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
                  <h3 className="font-heading text-lg lg:text-[1.2vw] font-normal text-[#2A170F] text-center mt-6 lg:mt-[1vw] mb-2 lg:mb-[0.4vw] hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>

                <p className="text-xs sm:text-[13px] lg:text-[0.8vw] leading-relaxed lg:leading-[1.5vw] text-[#664132]/90 font-secondary text-center w-full lg:max-w-none mx-auto mb-3 lg:mb-[0.6vw] min-h-[50px] lg:min-h-[3vw] line-clamp-3">
                  {product.description ||
                    product.subtitle ||
                    `${product.location} / ${product.category}`}
                </p>

                <ProductPrice
                  product={product}
                  className="font-secondary text-xs sm:text-[14px] lg:text-[0.9vw] font-bold text-[#2A170F] text-center mb-2 lg:mb-[0.4vw]"
                />

                <div className="flex items-center justify-center gap-1.5 mb-5 lg:mb-[1vw]">
                  <span className="text-[10px] lg:text-[0.65vw] text-[#9E7D6F] font-secondary uppercase tracking-wider">
                    Handmade in Nepal
                  </span>
                </div>

                <div className="self-center flex items-center gap-2 lg:gap-[0.5vw]">
                  <Button
                    type="button"
                    disabled={!canAdd}
                    className="lg:px-[2.5vw] lg:py-[0.85vw] lg:text-[0.7vw]"
                    onClick={() => {
                      if (canAdd) addToCart(product, 1);
                    }}
                  >
                    {stock < 1 ? 'Out of Stock' : canAdd ? 'Add to Cart' : 'Max in Cart'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`w-11 h-11 lg:w-[2.8vw] lg:h-[2.8vw] rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      wishlisted
                        ? 'border-primary bg-primary text-white'
                        : 'border-primary/15 text-[#2A170F] hover:border-primary hover:text-primary'
                    }`}
                  >
                    <Icon
                      icon={wishlisted ? 'ph:heart-fill' : 'ph:heart'}
                      className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]"
                    />
                  </button>
                </div>
              </div>
            );
            })}
        </div>
      </div>
    </section>
  );
};

export default Collection;
