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
    <section className="w-full pb-16 sm:pb-24 lg:pb-[6vw] select-none bg-background">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[4vw] items-center w-full lg:max-w-none">
          
          <div className="flex flex-col items-start text-left gap-6 lg:gap-[1.5vw] w-full lg:max-w-none">
            <div>
              <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-3 lg:mb-[0.6vw]">
                Why Choose Us
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight text-primary-dark mb-4 lg:mb-[0.8vw] tracking-tight">
                More Than a Marketplace
              </h2>
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-body opacity-95 max-w-xl lg:max-w-none w-full">
                We are a bridge between world-class artisans and conscious global shoppers — built on trust, transparency, and a deep love for Nepalese culture.
              </p>
            </div>

            <ul className="space-y-3.5 lg:space-y-[0.8vw] w-full lg:max-w-none">
              {checklistItems.map((item, index) => (
                <li 
                  key={index}
                  className="flex items-center gap-3.5 lg:gap-[0.8vw] text-xs sm:text-sm lg:text-[0.85vw] text-body"
                >
                  <div className="w-5 h-5 lg:w-[1.4vw] lg:h-[1.4vw] rounded-full bg-secondary-light/65 text-primary flex items-center justify-center shrink-0">
                    <Icon icon="lucide:check" className="w-3 h-3 lg:w-[0.8vw] lg:h-[0.8vw] stroke-3" />
                  </div>
                  <span className="font-secondary font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div 
            ref={containerRef}
            className="relative w-full aspect-square md:aspect-4/3.5 rounded-3xl lg:rounded-[1.6vw] overflow-hidden"
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