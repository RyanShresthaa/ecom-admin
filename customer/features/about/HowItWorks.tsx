'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface WorkStep {
  icon: string;
  number: string;
  label: string;
}

const workSteps: WorkStep[] = [
  {
    icon: "/images/about/works/works-1.png",
    number: "01",
    label: "Design"
  },
  {
    icon: "/images/about/works/works-2.png",
    number: "02",
    label: "Handcraft"
  },
  {
    icon: "/images/about/works/works-3.png",
    number: "03",
    label: "Quality Check"
  },
  {
    icon: "/images/about/works/works-4.png",
    number: "04",
    label: "Eco Packaging"
  },
  {
    icon: "/images/about/works/works-5.png",
    number: "05",
    label: "Worldwide Delivery"
  }
];

const HowItWorks = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const steps = container.querySelectorAll('.work-step');
    gsap.fromTo(
      steps,
      { opacity: 0, scale: 0.9, y: 20 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'back.out(1.2)',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <section className="w-full pb-16 sm:pb-24 lg:pb-[6vw] select-none bg-background">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto text-center">
        <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-4 lg:mb-[0.8vw]">
          How It Works
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight text-primary-dark mb-16 lg:mb-[4vw] tracking-tight">
          From Artisan Hands to Your Home
        </h2>

        <div 
          ref={containerRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-[2.5vw] w-full lg:max-w-none mx-auto items-start justify-center"
        >
          {workSteps.map((step, index) => (
            <div 
              key={index}
              className="work-step flex flex-col items-center gap-5 lg:gap-[1.2vw] transition-transform duration-300 w-full"
            >
              <div className="relative w-20 h-20 lg:w-[5vw] lg:h-[5vw] rounded-full bg-secondary/50 border border-primary/50 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] hover:bg-primary-lighter/60 cursor-pointer shrink-0">
                <Image 
                  src={step.icon} 
                  alt={`${step.label} icon`} 
                  width={28} 
                  height={28}
                  className="w-7 h-7 lg:w-[1.8vw] lg:h-[1.8vw] object-contain animate-pulse-slow"
                />
                
                <span className="absolute top-0.5 right-0.5 lg:top-[0.1vw] lg:right-[0.1vw] w-6 h-6 lg:w-[1.5vw] lg:h-[1.5vw] rounded-full bg-primary text-[9px] lg:text-[0.6vw] font-bold text-white flex items-center justify-center shadow-xs border border-background">
                  {step.number}
                </span>
              </div>

              <span className="font-heading text-sm sm:text-base lg:text-[1vw] font-semibold text-primary-dark tracking-wide text-center">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;