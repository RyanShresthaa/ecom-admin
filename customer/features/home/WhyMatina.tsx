'use client';

import React from 'react';
import Image from 'next/image';

const WhyMatina = () => {
  const points = [
    {
      icon: '/images/hero/icons/icon-1.png',
      title: 'Authentic Nepalese Craftsmanship',
      description: 'Every piece is carefully handmade using traditional, time-honored techniques passed down through generations of master Nepalese artisans, preserving our rich living heritage. From initial carving to the final touches, these processes require patience, precision, and decades of mastery to produce items of unmatched artistic character.',
    },
    {
      icon: '/images/hero/icons/icon-2.png',
      title: 'Fair Trade Artisan Support',
      description: 'We foster direct, ethical partnerships that guarantee fair wages, safe working environments, and sustainable livelihoods for the skilled hands behind each creation. By establishing ethical channels, we ensure that the value of this craftsmanship directly empowers local families and protects their economic stability.',
    },
    {
      icon: '/images/hero/icons/icon-3.png',
      title: 'Sustainably Handmade',
      description: "By utilizing locally sourced, organic, and eco-friendly raw materials, our low-impact production methods actively protect Nepal's pristine natural environment. We reject mass factory lines in favor of small-batch, zero-waste practices, making sure our ecological footprint remains minimal.",
    },
  ];

  return (
    <section className="w-full pb-16 sm:pb-24 md:pb-28 lg:pb-[6vw] flex items-center justify-center select-none">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none flex flex-col items-center">
        
        {/* Header */}
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight lg:leading-[1.1] tracking-tight text-center text-[#2A170F] mb-12 sm:mb-16 md:mb-20 lg:mb-[3.5vw]">
          Why <span className="text-(--primary-heading) ml-1.5 lg:ml-[0.4vw]">Matina Crafts</span>
        </h2>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-[2vw] w-full">
          {points.map((point, index) => (
            <div 
              key={index}
              className="group flex flex-col gap-6 lg:gap-[1.5vw] p-8 sm:p-10 lg:p-[2.2vw] rounded-[20px] lg:rounded-[1.2vw] bg-[#efe2d0] border border-primary/5 hover:bg-[#FAF6F2] hover:border-[#8C523A]/10 transition-all duration-500 ease-out hover:-translate-y-1"
            >
              {/* Icon Box */}
              <div className="w-12 h-12 lg:w-[3vw] lg:h-[3vw] rounded-xl lg:rounded-[0.8vw] bg-[#ebdbc4] flex items-center justify-center transition-colors duration-500 group-hover:bg-[#E6D5C3]">
                <Image 
                  src={point.icon} 
                  alt={point.title} 
                  width={24} 
                  height={24} 
                  className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw] object-contain"
                />
              </div>

              {/* Text */}
              <div className="flex flex-col gap-3 lg:gap-[0.8vw]">
                <h3 className="font-heading text-lg sm:text-xl lg:text-[1.4vw] font-normal leading-snug lg:leading-[1.2] text-[#2A170F]">
                  {point.title}
                </h3>
                <p className="text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-[#664132] font-secondary">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyMatina;