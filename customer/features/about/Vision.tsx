'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ValueCard {
  icon: string;
  title: string;
  description: string;
}

const valueCards: ValueCard[] = [
  {
    icon: "/images/about/vision/vision-1.png",
    title: "Authenticity",
    description: "Every product is handcrafted in Nepal by skilled artisans using traditional methods."
  },
  {
    icon: "/images/about/vision/vision-2.png",
    title: "Quality",
    description: "Exceptional craftsmanship in every piece — inspected before reaching your door."
  },
  {
    icon: "/images/about/vision/vision-3.png",
    title: "Fair Trade",
    description: "We ensure artisans receive fair wages and dignified working conditions."
  },
  {
    icon: "/images/about/vision/vision-4.png",
    title: "Sustainability",
    description: "Eco-conscious sourcing, natural materials, and minimal-waste packaging."
  },
  {
    icon: "/images/about/vision/vision-5.png",
    title: "Heritage",
    description: "Preserving Nepalese artistic traditions for future generations worldwide."
  },
  {
    icon: "/images/about/vision/vision-6.png",
    title: "Trust",
    description: "Full transparency — you know exactly who made your piece and how."
  }
];

const Vision = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll('.value-card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <section className="w-full pt-8 pb-16 sm:pb-24 select-none bg-background">
      <div className="container-custom max-w-7xl mx-auto px-4 text-center">
        <span className="block text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-primary-heading uppercase mb-4">
          What We Believe
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-primary-dark mb-12 sm:mb-16 tracking-tight">
          Our Core Values
        </h2>

        <div 
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {valueCards.map((card, index) => (
            <div 
              key={index}
              className="value-card p-8 border border-primary/20 rounded-2xl bg-secondary/50 flex flex-col items-start text-left gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                <Image 
                  src={card.icon} 
                  alt={`${card.title} icon`} 
                  width={20} 
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </div>

              <div>
                <h4 className="font-heading text-lg sm:text-xl font-semibold text-primary-dark mb-2">
                  {card.title}
                </h4>
                <p className="font-secondary text-xs sm:text-sm leading-relaxed text-body opacity-95">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Vision;