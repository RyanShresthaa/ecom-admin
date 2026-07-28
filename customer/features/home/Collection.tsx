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
      className="w-full bg-[#FAF6F2] py-20 md:py-28 select-none"
    >
      <div className="container-custom px-4">
        <div
          ref={headerRef}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20 flex flex-col items-center"
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#9E7D6F] mb-4 block">
            CURATED BY US
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-[42px] font-normal text-[#2A170F] leading-tight tracking-tight">
            Matina Crafts Collection
          </h2>
          <TextReveal className="text-xs sm:text-[14px] leading-relaxed text-[#664132] font-secondary mt-6 max-w-2xl">
            A selection of our most loved artisanal pieces, bringing together
            timeless elegance and everyday utility. From hand-spun paper to
            intricately carved decor, these curations represent the diverse heart
            of Nepali craft.
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6"
        >
          {loading && (
            <div className="col-span-full py-12 text-center font-secondary text-sm text-primary">
              Loading products…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center gap-4">
              <p className="font-secondary text-sm text-body/70">No products yet.</p>
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
              <div key={product.id} className="flex flex-col items-center">
                <Link
                  href={`/products/${product.slug}`}
                  className="collection-image-container relative aspect-4/5 w-full bg-[#FAF8F5] overflow-hidden border border-[#E6D5C3]/30 hover:border-[#8C523A]/20 transition-all duration-500 group flex items-center justify-center"
                >
                  <div className="collection-image-wrapper absolute w-full h-[120%] top-[-10%] flex items-center justify-center p-6 sm:p-8">
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
                  <h3 className="font-heading text-lg font-normal text-[#2A170F] text-center mt-6 mb-2 hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>

                <p className="text-xs sm:text-[13px] leading-relaxed text-[#664132]/90 font-secondary text-center max-w-xs mx-auto mb-3 min-h-[50px] line-clamp-3">
                  {product.description ||
                    product.subtitle ||
                    `${product.location} / ${product.category}`}
                </p>

                <ProductPrice
                  product={product}
                  className="font-secondary text-xs sm:text-[14px] font-bold text-[#2A170F] text-center mb-2"
                />

                <div className="flex items-center justify-center gap-1.5 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      icon="ph:star-fill"
                      className="w-3 h-3 text-[#C2836B] opacity-80"
                    />
                  ))}
                  <span className="text-[10px] text-[#9E7D6F] ml-1 font-secondary">
                    (5.0)
                  </span>
                </div>

                <div className="self-center flex items-center gap-2">
                  <Button type="button" onClick={() => addToCart(product, 1)}>
                    Add to Cart
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      wishlisted
                        ? 'border-primary bg-primary text-white'
                        : 'border-primary/15 text-[#2A170F] hover:border-primary hover:text-primary'
                    }`}
                  >
                    <Icon
                      icon={wishlisted ? 'ph:heart-fill' : 'ph:heart'}
                      className="w-4 h-4"
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
