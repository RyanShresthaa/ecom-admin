'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Button from '@/shared/ui/Button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const AboutHero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const statsContainerRef = useRef<HTMLDivElement>(null);

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

    const statsContainer = statsContainerRef.current;
    if (statsContainer) {
      const targets = statsContainer.querySelectorAll('.stat-number');
      targets.forEach((target) => {
        const endVal = parseInt(target.getAttribute('data-value') || '0', 10);
        const suffix = target.getAttribute('data-suffix') || '';
        
        const obj = { value: 0 };
        gsap.to(obj, {
          value: endVal,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: statsContainer,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          onUpdate: () => {
            target.textContent = Math.round(obj.value) + suffix;
          },
        });
      });
    }
  }, []);

  return (
    <section className="w-full pb-20 md:pb-28 flex items-center justify-center">
      <div className="container-custom px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        <div 
          ref={containerRef}
          className="relative aspect-4/3 w-full rounded-xl md:rounded-2xl overflow-hidden "
        >
          <div 
            ref={imageWrapperRef}
            className="absolute top-[-15%] left-0 w-full h-[130%]"
          >
            <Image
              src="/images/hero/history/history-1.jpg"
              alt="Nepalese weaver weaving Dhaka fabric"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 items-start text-left">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight tracking-tight select-none">
            Every Craft
            <br />
            <span className="text-[#c89b5d]">Tells a Story</span>
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed text-[#664132] max-w-xl font-secondary">
            We partner directly with Nepalese artisans, ensuring fair wages and preserving centuries-old traditions. Every handmade piece carries the passion and skill of the craftsperson who created it. By bridging the gap between local heritage and modern design, we create sustainable opportunities that empower these communities to keep their artistic lineage thriving for generations.
          </p>

          <div ref={statsContainerRef} className="grid grid-cols-3 gap-6 sm:gap-8 w-full border-t border-b border-primary/10 py-6 my-2">
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-(--primary-heading) stat-number" data-value="500" data-suffix="+">0+</span>
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-(--text-muted)">Artisans Supported</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-(--primary-heading) stat-number" data-value="30" data-suffix="+">0+</span>
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-(--text-muted)">Districts</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-(--primary-heading) stat-number" data-value="100" data-suffix="%">0%</span>
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-(--text-muted)">Handmade</span>
            </div>
          </div>

          <div className="mt-2">
            <Button variant="primary" onClick={() => window.location.href = '/our-story'}>
              Our Story
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutHero;