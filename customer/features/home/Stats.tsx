'use client';

import React from 'react';
import Image from 'next/image';

const Stats = () => {
  const items = [
    {
      icon: '/images/hero/icons/icon-4.png',
      title: 'Worldwide Ordering',
      description: 'Seamlessly order from anywhere in the world using international payment methods.',
    },
    {
      icon: '/images/hero/icons/icon-5.png',
      title: 'Fast 2-5 Day Delivery',
      description: 'We ensure your gifts reach your loved ones across Nepal within 2 to 5 business days.',
    },
    {
      icon: '/images/hero/icons/icon-6.png',
      title: 'Authentic Products',
      description: 'Curated selection of traditional Nepali items and premium local artisan creations.',
    },
    {
      icon: '/images/hero/icons/icon-7.png',
      title: 'Secure Payments',
      description: 'Multiple layers of security to protect your transactions and personal data.',
    },
  ];

  return (
    <section className="w-full pb-10 select-none">
      <div className="container-custom px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 lg:gap-8 xl:gap-12">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="group flex flex-col items-center text-center cursor-pointer"
            >
              {/* Icon Container */}
              <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-[24px] bg-[#F5ECE8] flex items-center justify-center mb-6 transition-all duration-500 ease-out group-hover:scale-105 group-hover:bg-[#efe2d0] group-hover:shadow-[0_12px_24px_rgba(140,82,58,0.06)]">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-500 ease-out group-hover:scale-110">
                  <Image
                    src={item.icon}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 36px, 40px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <h3 className="font-sans text-base sm:text-lg font-semibold text-[#2A170F] mb-3 transition-colors duration-300 group-hover:text-primary">
                {item.title}
              </h3>

              {/* Description */}
              <p className="font-secondary text-xs sm:text-sm leading-relaxed text-[#664132]/80 max-w-[280px] sm:max-w-[260px]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
