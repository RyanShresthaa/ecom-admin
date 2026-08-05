'use client';

import React from 'react';
import Button from '@/shared/ui/Button';

const Cta = () => {
  return (
    <section className="relative w-full overflow-hidden select-none py-20 sm:py-28 lg:py-[7vw] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-3000 hover:scale-105"
        style={{ backgroundImage: "url('/images/hero/hero-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-primary-dark/80" />

      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none text-center text-white flex flex-col items-center gap-5 md:gap-6 lg:gap-[1.2vw] mx-auto">
        <span className="text-[10px] sm:text-xs lg:text-[0.75vw] font-semibold uppercase tracking-[0.25em] text-primary-heading">
          Begin Your Journey
        </span>

        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.4vw] font-normal leading-tight text-white tracking-tight select-none max-w-4xl lg:max-w-none w-full">
          Bring Nepal's Heritage Into Your Home.
        </h2>

        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-white/80 max-w-lg lg:max-w-none w-full mx-auto leading-relaxed lg:leading-[1.6vw]">
          Discover handcrafted pieces that celebrate centuries of Nepalese culture while directly supporting local artisan communities.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-[1vw] mt-4 lg:mt-[1vw]">
          <Button 
            variant="primary" 
            className="bg-primary-heading! border-primary-heading! text-primary-dark! hover:bg-white! hover:border-white! shadow-none!"
            onClick={() => window.location.href = '/shop'}
          >
            Shop Collection
          </Button>
          <Button 
            variant="secondary" 
            className="bg-white! border-white! text-primary-dark! hover:bg-white! hover:border-white! shadow-none!"
            onClick={() => window.location.href = '/contact'}
          >
            Contact Us
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Cta;