'use client';

import React from 'react';
import Button from '@/shared/ui/Button';

const Cta = () => {
  return (
    <section className="relative w-full overflow-hidden select-none py-20 sm:py-28 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-3000 hover:scale-105"
        style={{ backgroundImage: "url('/images/hero/hero-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-primary-dark/80" />

      <div className="relative z-10 container-custom text-center text-white flex flex-col items-center gap-5 md:gap-6 max-w-4xl px-4">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-primary-heading">
          Begin Your Journey
        </span>

        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white tracking-tight select-none">
          Bring Nepal's Heritage Into Your Home.
        </h2>

        <p className="font-secondary text-xs sm:text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
          Discover handcrafted pieces that celebrate centuries of Nepalese culture while directly supporting local artisan communities.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
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