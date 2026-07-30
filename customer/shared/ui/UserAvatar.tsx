'use client';

import React, { useState } from 'react';
import Image from 'next/image';

type Props = {
  name?: string;
  avatar?: string | null;
  size?: number;
  className?: string;
};

function InitialsAvatar({
  name,
  size,
  className,
}: {
  name?: string;
  size: number;
  className: string;
}) {
  const initials =
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '?';

  return (
    <div
      className={`rounded-full border-2 border-primary/20 bg-[#F3EBE2] text-[#7C4831] flex items-center justify-center font-heading font-bold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(14, size * 0.32) }}
      aria-label={name || 'User'}
    >
      {initials}
    </div>
  );
}

/** Real avatar when available; otherwise initials — never a stock mock photo. */
export default function UserAvatar({ name, avatar, size = 80, className = '' }: Props) {
  const src = typeof avatar === 'string' ? avatar.trim() : '';
  const [failed, setFailed] = useState(false);
  const isRemote = /^https?:\/\//i.test(src);

  if (!src || failed) {
    return <InitialsAvatar name={name} size={size} className={className} />;
  }

  // Google (and some CDNs) block hotlinks when a Referrer is sent.
  if (isRemote) {
    return (
      <div
        className={`relative rounded-full overflow-hidden border-2 border-primary/20 bg-[#F3EBE2] ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name || 'User'}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-primary/20 bg-[#F3EBE2] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name || 'User'}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
