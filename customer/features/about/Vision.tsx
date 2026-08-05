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
    <section className="w-full pt-8 pb-16 sm:pb-24 lg:pb-[6vw] select-none bg-background">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto text-center">
        <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-4 lg:mb-[0.8vw]">
          What We Believe
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight text-primary-dark mb-12 sm:mb-16 lg:mb-[3vw] tracking-tight">
          Our Core Values
        </h2>

        <div 
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-[2vw] w-full lg:max-w-none"
        >
          {valueCards.map((card, index) => (
            <div 
              key={index}
              className="value-card p-8 lg:p-[1.8vw] border border-primary/20 rounded-2xl lg:rounded-[1.2vw] bg-secondary/50 flex flex-col items-start text-left gap-4 lg:gap-[1vw] w-full lg:max-w-none"
            >
              <div className="w-10 h-10 lg:w-[2.4vw] lg:h-[2.4vw] rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                <Image 
                  src={card.icon} 
                  alt={`${card.title} icon`} 
                  width={20} 
                  height={20}
                  className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw] object-contain"
                />
              </div>

              <div>
                <h4 className="font-heading text-lg sm:text-xl lg:text-[1.2vw] font-semibold text-primary-dark mb-2 lg:mb-[0.4vw]">
                  {card.title}
                </h4>
                <p className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] leading-relaxed lg:leading-[1.5vw] text-body opacity-95">
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