'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative w-full aspect-[4/4.5] rounded-2xl overflow-hidden border-2 border-primary/15 bg-white shadow-sm">
        <Image
          src={images[activeIndex]}
          alt={`${productName} — main view`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover object-center transition-opacity duration-500"
        />
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
              idx === activeIndex
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-primary/10 hover:border-primary/30'
            }`}
          >
            <Image
              src={img}
              alt={`${productName} — thumbnail ${idx + 1}`}
              fill
              sizes="120px"
              className="object-cover object-center"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
