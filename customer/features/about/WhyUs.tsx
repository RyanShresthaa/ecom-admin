'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const checklistItems = [
  "Authentic Nepalese Craftsmanship, guaranteed",
  "Fair Trade Partnerships with every artisan",
  "Sustainable & natural materials only",
  "Every piece is individually handmade",
  "Free worldwide shipping over $100",
  "Verified, trusted marketplace since 2026"
];

const WhyUs = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const imageWrapper = imageWrapperRef.current;

    if (container && imageWrapper) {
      gsap.fromTo(
        imageWrapper,
        { yPercent: -12, scale: 1.1 },
        {
          yPercent: 12,
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
  }, []);

  return (
    <section className="w-full pb-16 sm:pb-24 select-none bg-background">
      <div className="container-custom max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          <div className="flex flex-col items-start text-left gap-6">
            <div>
              <span className="block text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-primary-heading uppercase mb-3">
                Why Choose Us
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-primary-dark mb-4 tracking-tight">
                More Than a Marketplace
              </h2>
              <p className="font-secondary text-xs sm:text-sm leading-relaxed text-body opacity-95 max-w-xl">
                We are a bridge between world-class artisans and conscious global shoppers — built on trust, transparency, and a deep love for Nepalese culture.
              </p>
            </div>

            <ul className="space-y-3.5 w-full">
              {checklistItems.map((item, index) => (
                <li 
                  key={index}
                  className="flex items-center gap-3.5 text-xs sm:text-sm text-body"
                >
                  <div className="w-5 h-5 rounded-full bg-secondary-light/65 text-primary flex items-center justify-center shrink-0">
                    <Icon icon="lucide:check" className="w-3 h-3 stroke-3" />
                  </div>
                  <span className="font-secondary font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div 
            ref={containerRef}
            className="relative w-full aspect-square md:aspect-4/3.5  rounded-3xl overflow-hidden"
          >
            <div 
              ref={imageWrapperRef}
              className="absolute top-[-15%] left-0 w-full h-[130%]"
            >
              <Image
                src="/images/about/why-us.png"
                alt="Nepalese handicrafts collection"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                priority
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyUs;