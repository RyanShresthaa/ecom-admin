'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const Hero = () => {
  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden ">
      
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/images/hero/hero-bg.jpg')" }}
      />
      
      <div className="absolute inset-0 bg-black/50 z-10" />

      <div className="relative z-20 container-custom text-center text-white flex flex-col items-center gap-5 md:gap-6 max-w-4xl px-4">
        
        {/* Small uppercase label */}
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-primary-light select-none">
          Handmade Heritage
        </span>

        {/* Two-line heading */}
        <h1 className="font-secondary! text-3xl sm:text-4xl md:text-7xl font-normal leading-[1.15] tracking-tight text-white select-none">
          Handmade in Nepal.
          <br />
          <span className="text-(--primary-heading)">Crafted for the World.</span>
        </h1>

        {/* Description */}
        <p className="text-[9px] sm:text-xs font-medium uppercase tracking-[0.25em] text-white/70 max-w-md sm:max-w-xl leading-5 select-none">
          Discover authentic handcrafted treasures made by skilled Nepalese artisans, preserving centuries of culture while bringing timeless beauty into modern homes.
        </p>

        {/* CTA Button */}
        <div className="mt-2">
          <Link 
            href="/shop" 
            className="relative inline-flex items-center justify-center px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-primary text-white rounded-full border-2 border-primary hover:bg-primary-dark hover:border-primary-dark transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] shadow-[0_4px_16px_rgba(140,82,58,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Shop Products
          </Link>
        </div>

      </div>

      <button 
        type="button"
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-2 text-white/50 hover:text-white transition-colors focus:outline-none cursor-pointer hidden sm:block"
        aria-label="Previous slide"
      >
        <Icon icon="ph:caret-left-light" className="w-8 h-8" />
      </button>

      <button 
        type="button"
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-2 text-white/50 hover:text-white transition-colors focus:outline-none cursor-pointer hidden sm:block"
        aria-label="Next slide"
      >
        <Icon icon="ph:caret-right-light" className="w-8 h-8" />
      </button>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        <button 
          className="w-1.5 h-1.5 rounded-full bg-white transition-all duration-300" 
          aria-label="Go to slide 1"
        />
        <button 
          className="w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300" 
          aria-label="Go to slide 2"
        />
        <button 
          className="w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300" 
          aria-label="Go to slide 3"
        />
      </div>

    </section>
  );
};

export default Hero;