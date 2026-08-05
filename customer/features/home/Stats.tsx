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
    <section className="w-full pb-10 lg:pb-[4vw] select-none">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 lg:gap-[2.5vw] w-full">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="group flex flex-col items-center text-center cursor-pointer w-full"
            >
              {/* Icon Container */}
              <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] lg:w-[6.5vw] lg:h-[6.5vw] rounded-[24px] lg:rounded-[1.4vw] bg-[#F5ECE8] flex items-center justify-center mb-6 lg:mb-[1.2vw] transition-all duration-500 ease-out group-hover:scale-105 group-hover:bg-[#efe2d0] group-hover:shadow-[0_12px_24px_rgba(140,82,58,0.06)]">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-[2.2vw] lg:h-[2.2vw] transition-transform duration-500 ease-out group-hover:scale-110">
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
              <h3 className="font-sans text-base sm:text-lg lg:text-[1.1vw] font-semibold text-[#2A170F] mb-3 lg:mb-[0.6vw] transition-colors duration-300 group-hover:text-primary">
                {item.title}
              </h3>

              {/* Description */}
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-[#664132]/80 max-w-[280px] sm:max-w-[260px] lg:max-w-none w-full">
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
