'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Circle data: position (%), size (px), and image
const circles = [
  // Large center
  { top: 38, left: 50, size: 240, img: '/images/hero/gallery/center-left.png', alt: 'Handcrafted vessel detail' },
  // Medium circles
  { top: 22, left: 32, size: 180, img: '/images/hero/gallery/left.png', alt: 'Artisan workspace' },
  { top: 40, left: 67, size: 180, img: '/images/hero/gallery/center-right.png', alt: 'Artisan at work' },
  { top: 65, left: 70, size: 160, img: '/images/hero/gallery/right.png', alt: 'Handcrafted detail' },
  { top: 54, left: 34, size: 180, img: '/images/hero/gallery/featured1.png', alt: 'Craft tools' },
  // Small circles  
  { top: 18, left: 18, size: 120, img: '/images/hero/gallery/center-right.png', alt: 'Artisan hands' },
  { top: 10, left: 48, size: 140, img: '/images/hero/gallery/featured2.png', alt: 'Pottery work' },
  { top: 12, left: 74, size: 100, img: '/images/hero/gallery/left.png', alt: 'Woven crafts' },
  { top: 35, left: 80, size: 180, img: '/images/hero/gallery/right.png', alt: 'Jewelry craft' },
  { top: 70, left: 50, size: 160, img: '/images/hero/gallery/center-left.png', alt: 'Brass work' },
  { top: 72, left: 18, size: 140, img: '/images/hero/gallery/featured1.png', alt: 'Weaving detail' },
  { top: 42, left: 14, size: 180, img: '/images/hero/gallery/center-right.png', alt: 'Carving tools' },
  // Tiny accent circles
  { top: 75, left: 60, size: 120, img: '/images/hero/gallery/featured2.png', alt: 'Small craft' },
  { top: 68, left: 85, size: 170, img: '/images/hero/gallery/left.png', alt: 'Thread detail' },
  { top: 78, left: 36, size: 140, img: '/images/hero/gallery/right.png', alt: 'Paint detail' },
  { top: 15, left: 60, size: 140, img: '/images/hero/gallery/center-left.png', alt: 'Beads' },
  // { top: 80, left: 65, size: 120, img: '/images/hero/gallery/featured2.png', alt: 'Fabric detail' },
  // { top: 48, left: 40, size: 120, img: '/images/hero/gallery/center-right.png', alt: 'Mini craft' },
];

const Gallery = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const quickXTweens = useRef<ReturnType<typeof gsap.quickTo>[]>([]);
  const quickYTweens = useRef<ReturnType<typeof gsap.quickTo>[]>([]);

  // Mouse/touch drag handler — moves circles along with cursor
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const field = fieldRef.current;
    if (!field) return;

    const rect = field.getBoundingClientRect();
    // Normalize cursor position to -1...1 relative to center of field
    const normX = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((clientY - rect.top) / rect.height - 0.5) * 2;

    // If dragging, use drag offset; otherwise use hover position
    const offsetX = isDragging.current
      ? (clientX - dragStart.current.x) * 0.3 + normX * 15
      : normX * 15;
    const offsetY = isDragging.current
      ? (clientY - dragStart.current.y) * 0.3 + normY * 10
      : normY * 10;

    circleRefs.current.forEach((el, i) => {
      if (!el || !quickXTweens.current[i]) return;
      // Parallax depth: smaller circles move more
      const size = circles[i]?.size ?? 150;
      const depth = 1 - (size / 300); // 0.2 for large, 0.6+ for small
      const intensity = 0.5 + depth * 1.5; // 0.8–1.4 range

      quickXTweens.current[i](offsetX * intensity);
      quickYTweens.current[i](offsetY * intensity);
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    // Spring circles back to origin
    circleRefs.current.forEach((_, i) => {
      if (!quickXTweens.current[i]) return;
      quickXTweens.current[i](0);
      quickYTweens.current[i](0);
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const field = fieldRef.current;
    if (!section || !field) return;

    const ctx = gsap.context(() => {
      // Create quickTo tweens for each circle (smooth interpolation)
      circleRefs.current.forEach((el, i) => {
        if (!el) return;
        quickXTweens.current[i] = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
        quickYTweens.current[i] = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      });

      // Breathing / pulsing animations
      circleRefs.current.forEach((el, i) => {
        if (!el) return;

        // Randomize animation parameters for organic feel
        const duration = 2.5 + Math.random() * 3; // 2.5–5.5s
        const scaleMin = 0.7 + Math.random() * 0.15; // 0.7–0.85
        const scaleMax = 1.0 + Math.random() * 0.08; // 1.0–1.08
        const delay = Math.random() * 3; // stagger randomly

        // Set initial scale
        gsap.set(el, { scale: scaleMin, opacity: 0 });

        // Fade in on scroll
        gsap.to(el, {
          opacity: 1,
          scale: scaleMax,
          duration: 0.8,
          delay: i * 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        // Continuous breathing / pulsing animation
        gsap.to(el, {
          scale: scaleMin,
          duration: duration,
          delay: delay + 0.8 + i * 0.06,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });
    }, section);

    // Mouse events on the circle field
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => handleDragEnd();
    const onMouseLeave = () => handleDragEnd();

    // Touch events
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        isDragging.current = true;
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => handleDragEnd();

    field.addEventListener('mousemove', onMouseMove);
    field.addEventListener('mousedown', onMouseDown);
    field.addEventListener('mouseup', onMouseUp);
    field.addEventListener('mouseleave', onMouseLeave);
    field.addEventListener('touchmove', onTouchMove, { passive: true });
    field.addEventListener('touchstart', onTouchStart, { passive: true });
    field.addEventListener('touchend', onTouchEnd);

    return () => {
      ctx.revert();
      field.removeEventListener('mousemove', onMouseMove);
      field.removeEventListener('mousedown', onMouseDown);
      field.removeEventListener('mouseup', onMouseUp);
      field.removeEventListener('mouseleave', onMouseLeave);
      field.removeEventListener('touchmove', onTouchMove);
      field.removeEventListener('touchstart', onTouchStart);
      field.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#FAF6F2] pt-16 sm:pt-20 md:pt-24 overflow-hidden select-none"
    >
      {/* Heading */}
      <div className="relative z-10 text-center mb-6 md:mb-8 px-4">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-[1.15] tracking-tight text-heading">
          Crafted by Hand,
          <br />
          <span className="text-(--primary-heading)">Built for the World</span>
        </h2>
        <p className="mt-4 text-xs sm:text-lg text-body/70 max-w-md mx-auto">
          Scroll through our curated collection of authentic Nepalese handcrafted treasures
        </p>
      </div>

      {/* Circle field */}
      <div ref={fieldRef} className="relative w-full mx-auto cursor-grab active:cursor-grabbing" style={{ height: 'clamp(500px, 70vw, 750px)' }}>
        {circles.map((c, i) => (
          <div
            key={i}
            ref={(el) => { circleRefs.current[i] = el; }}
            className="absolute rounded-full overflow-hidden shadow-lg"
            style={{
              top: `${c.top}%`,
              left: `${c.left}%`,
              width: `clamp(${Math.round(c.size * 0.5)}px, ${(c.size / 11).toFixed(1)}vw, ${c.size}px)`,
              height: `clamp(${Math.round(c.size * 0.5)}px, ${(c.size / 11).toFixed(1)}vw, ${c.size}px)`,
              transform: 'translate(-50%, -50%)',
              opacity: 0,
            }}
          >
            <Image
              src={c.img}
              alt={c.alt}
              fill
              sizes={`${c.size}px`}
              className="object-cover"
            />
          </div>
        ))}

      </div>

      {/* Scroll to explore indicator */}
      {/* <div className="relative z-10 flex flex-col items-center gap-2 mt-8 md:mt-12">
        <span className="text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-body/50">
          Scroll to explore
        </span>
        <span className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
      </div> */}
    </section>
  );
};

export default Gallery;