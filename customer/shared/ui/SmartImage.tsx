'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  fallbackSrc?: string;
};

function isRemoteUrl(src: string) {
  return /^https?:\/\//i.test(src);
}

/**
 * Profile/order images often come from Cloudinary or Google.
 * Use a plain <img> for remote URLs (avoids Next optimizer + Referrer blocks);
 * keep next/image for local public assets.
 */
export default function SmartImage({
  src,
  alt,
  className = '',
  width,
  height,
  fill = false,
  sizes,
  fallbackSrc = '/images/hero/gallery/center-left.png',
}: Props) {
  const normalized = (src || '').trim() || fallbackSrc;
  const [current, setCurrent] = useState(normalized);
  const [failedFallback, setFailedFallback] = useState(false);

  useEffect(() => {
    setCurrent((src || '').trim() || fallbackSrc);
    setFailedFallback(false);
  }, [src, fallbackSrc]);

  if (failedFallback) {
    return (
      <div
        className={`bg-[#F5ECE8] ${className}`}
        style={fill ? { position: 'absolute', inset: 0 } : { width, height }}
        aria-label={alt}
      />
    );
  }

  const onError = () => {
    if (current !== fallbackSrc) {
      setCurrent(fallbackSrc);
    } else {
      setFailedFallback(true);
    }
  };

  if (isRemoteUrl(current)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={current}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        referrerPolicy="no-referrer"
        onError={onError}
        className={
          fill ? `absolute inset-0 h-full w-full object-cover ${className}` : className
        }
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={current}
        alt={alt}
        fill
        sizes={sizes || '96px'}
        className={className}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={current}
      alt={alt}
      width={width || 96}
      height={height || 96}
      className={className}
      onError={onError}
    />
  );
}
