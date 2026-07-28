"use client";

import Image from "next/image";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface DividerProps {
  image: string;
  alt?: string;
  className?: string;
  height?: string; 
}

const Divider: React.FC<DividerProps> = ({
  image,
  alt = "divider",
  className = "",
  height = "h-[80vh]",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        {
          yPercent: -30,
          scale: 1.1,
        },
        {
          yPercent: 30,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full relative ${height} flex items-center justify-center overflow-hidden ${className}`}
    >
      <div
        ref={imageRef}
        className={`absolute inset-0 w-full ${height} origin-center z-10`}
      >
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      {/* <Grainy /> */}
    </div>
  );
};

export default Divider;
