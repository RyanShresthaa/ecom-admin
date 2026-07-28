'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import useEmblaCarousel from 'embla-carousel-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextReveal } from '@/shared/ui/TextReveal';
import Button from '@/shared/ui/Button';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Product {
  id: string;
  tagline: string;
  title: string;
  price: string;
  descriptionParagraphs: string[];
  imageSrc: string;
  bullets: string[];
}

const productsData: Product[] = [
  {
    id: 'dhaka-scarf',
    tagline: 'TRADITIONAL TEXTILES',
    title: 'Hand-Spun Dhaka Scarf',
    price: 'Rs 3,450.00',
    descriptionParagraphs: [
      'Dhaka is more than just a fabric; it is the woven identity of Nepal. Historically worn by royalty and made entirely of hand-spun cotton, the technique involves an incredibly complex supplementary weft style.',
      'What makes Dhaka truly remarkable is that there are no written patterns or charts. Every geometric motif, from stars to flowers, is memorized by the artisan and woven intuitively, making each piece inherently unique.'
    ],
    imageSrc: '/images/hero/textile/textile1.png',
    bullets: [
      '100% Hand-loomed organic cotton.',
      'Supports women weaver cooperatives in Palpa.',
      'Dyed using natural, azo-free plant extracts.'
    ]
  },
  {
    id: 'indigo-throw',
    tagline: 'HERITAGE HOME',
    title: 'Indigo Heritage Throw',
    price: 'Rs 2,850.00',
    descriptionParagraphs: [
      'Bringing traditional patterns into the modern home. Woven by hand using certified organic threads dyed with indigo and other native plants from the mid-hills of Nepal.',
      'Every thread is hand-selected and carefully interlaced to ensure strength, durability, and a rich textural experience that highlights the organic beauty of raw craftsmanship.'
    ],
    imageSrc: '/images/hero/gallery/right.png',
    bullets: [
      '100% Organic cotton & wild hemp.',
      'Ethically handmade by local women in Bhaktapur.',
      'Colored using native Himalayan plant dyes.'
    ]
  },
  {
    id: 'yak-shawl',
    tagline: 'WILD FIBERS',
    title: 'Yak Wool Organic Wrap',
    price: 'Rs 5,500.00',
    descriptionParagraphs: [
      'Crafted from premium yak wool sourced from high-altitude Himalayan regions. Known for its incredible warmth, softness, and natural water-resistant properties.',
      'Each shawl is hand-finished with meticulous hand-sewn details along the borders, creating a durable and highly functional heritage accessory that stands the test of time.'
    ],
    imageSrc: '/images/hero/gallery/center-right.png',
    bullets: [
      '100% Pure high-altitude Himalayan yak wool.',
      'Meticulously hand-finished and bound.',
      'Naturally warm, lightweight, and breathable.'
    ]
  }
];

// Sub-component for individual product slide to manage its own quantity state
const ProductSlide = ({ product }: { product: Product }) => {
  const [quantity, setQuantity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1));
  const handleIncrease = () => setQuantity((q) => q + 1);

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = imageWrapperRef.current;
    if (!container || !wrapper) return;

    // Apply scroll parallax to the active slide image wrapper
    const animation = gsap.fromTo(
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

    return () => {
      animation.scrollTrigger?.kill();
      animation.kill();
    };
  }, [product.id]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center px-4 md:px-12 py-4"
    >
      {/* Left Column: Image with Scroll Parallax */}
      <div className="relative aspect-square rounded-2xl overflow-hidden w-full bg-[#FAF8F5]  border border-[#E6D5C3]/30 hover:border-[#8C523A]/20 transition-all duration-500 group flex items-center justify-center">
        <div
          ref={imageWrapperRef}
          className="absolute w-full h-[110%] top-[-10%] flex items-center justify-center p-6 sm:p-12"
        >
          <Image
            src={product.imageSrc}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority
          />
        </div>
      </div>

      {/* Right Column: Product Detail Form */}
      <div className="flex flex-col text-left">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#9E7D6F] mb-2 select-none">
          {product.tagline}
        </span>

        <h3 className="font-heading text-3xl sm:text-4xl font-normal text-[#2A170F] leading-tight tracking-tight mb-2">
          {product.title}
        </h3>

        <span className="font-secondary text-sm sm:text-base font-bold text-[#8C523A] mb-6 block">
          {product.price}
        </span>

        {/* Paragraphs */}
        <div className="flex flex-col gap-4 text-xs sm:text-[14px] leading-relaxed text-[#664132]/95 font-secondary mb-8">
          {product.descriptionParagraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-primary/5 mb-6" />

        {/* Buy Form Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          {/* Quantity Selector */}
          <div className="flex flex-col gap-1.5 self-start sm:self-auto">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9E7D6F]">
              QUANTITY
            </span>
            <div className="flex items-center border border-[#E6D5C3] bg-white h-12 w-28">
              <button
                type="button"
                onClick={handleDecrease}
                className="flex-1 h-full text-[#664132] hover:text-[#8C523A] hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center font-bold text-sm"
              >
                -
              </button>
              <span className="w-8 text-center font-secondary text-[13px] font-semibold text-[#2A170F] select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrease}
                className="flex-1 h-full text-[#664132] hover:text-[#8C523A] hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center font-bold text-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Add To Cart Button */}
          <div className="flex-1 flex flex-col gap-1.5 justify-end pt-3.5">
            <Button
              className="w-full h-12 bg-[#C2A388] text-white hover:bg-[#B59479] hover:shadow-sm font-semibold text-[11px] sm:text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center border-none"
            >
              Add to Cart
            </Button>
          </div>
        </div>

        {/* Bullet Points */}
        <ul className="flex flex-col gap-2.5 text-xs text-[#664132] font-secondary mb-8">
          {product.bullets.map((bullet, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="text-[#8C523A] font-semibold text-[13px] select-none">✓</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Share Story */}
        <div className="flex items-center gap-3.5 text-xs text-[#9E7D6F] font-secondary">
          <span className="uppercase tracking-wider text-[10px] font-semibold">Share this story:</span>
          <div className="flex items-center gap-3 text-neutral-500">
            <a href="#" className="hover:text-[#8C523A] transition-colors" aria-label="Share on Facebook">
              <Icon icon="ph:facebook-logo-light" className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#8C523A] transition-colors" aria-label="Share on Twitter">
              <Icon icon="ph:twitter-logo-light" className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#8C523A] transition-colors" aria-label="Share on Instagram">
              <Icon icon="ph:instagram-logo-light" className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const Textile = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Setup Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 35,
    align: 'center'
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const ctx = gsap.context(() => {
      // Header staggered reveal animation
      gsap.fromTo(
        headerEl.children,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerEl,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="w-full bg-[#FAF6F2] py-20 md:py-28 select-none relative"
    >
      <div className="container-custom max-w-6xl px-4 relative">

        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16 md:mb-10 flex flex-col items-center">
          {/* <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#9E7D6F] mb-4 block">
            FEATURED TEXTILE
          </span> */}
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal text-[#2A170F] leading-tight tracking-tight">
            The Royal <span className="text-[#c89b5d]">Dhaka Weave </span>

          </h2>
        </div>

        <div className="relative w-full">

          <div className="overflow-hidden w-full" ref={emblaRef}>
            <div className="flex">
              {productsData.map((product) => (
                <div className="flex-[0_0_100%] min-w-0" key={product.id}>
                  <ProductSlide product={product} />
                </div>
              ))}
            </div>
          </div>


          <button
            type="button"
            onClick={scrollPrev}
            className="absolute -left-4 lg:-left-6 top-[225px] md:top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-[#E6D5C3] bg-white/95 hover:bg-[#8C523A] hover:text-white flex items-center justify-center text-[#2A170F] transition-all duration-300 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <Icon icon="ph:caret-left-light" className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={scrollNext}
            className="absolute -right-4 lg:-right-6 top-[225px] md:top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-[#E6D5C3] bg-white/95 hover:bg-[#8C523A] hover:text-white flex items-center justify-center text-[#2A170F] transition-all duration-300 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <Icon icon="ph:caret-right-light" className="w-5 h-5" />
          </button>

        </div>

      </div>
    </section>
  );
};

export default Textile;