'use client';

import React from 'react';

const ProductsHero = () => {
  return (
    <section className="relative w-full h-[80vh] overflow-hidden select-none py-20 sm:py-28 md:py-36 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero/hero-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 container-custom text-center text-white flex flex-col items-center gap-4 md:gap-5 max-w-3xl px-4">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-primary-heading">
          Authentic Handcrafts
        </span>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight text-white tracking-tight">
          Shop All <span className="text-primary-heading">Products</span>
        </h1>

        <p className="font-secondary text-xs sm:text-sm text-white/80 max-w-xl mx-auto leading-relaxed">
          Discover authentic handmade treasures crafted by 500+ artisans across Nepal.
        </p>
      </div>
    </section>
  );
};

export default ProductsHero;