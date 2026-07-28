'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Button from '@/shared/ui/Button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const Story = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const imageWrapper = imageWrapperRef.current;
        if (container && imageWrapper) {
            gsap.fromTo(
                imageWrapper,
                { yPercent: -12, scale: 1.1 },
                {
                    yPercent: 12,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: container,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                }
            );
        }
    }, []);

    return (
        <section className="w-full py-16 sm:py-24 md:py-28 select-none">
            <div className="container-custom max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-26 items-center">

                    <div 
                        ref={containerRef}
                        className="relative w-full aspect-square md:aspect-4/3.5 rounded-2xl md:rounded-2xl overflow-hidden"
                    >
                        <div 
                            ref={imageWrapperRef}
                            className="absolute top-[-15%] left-0 w-full h-[130%]"
                        >
                            <Image
                                src="/images/about/story.png"
                                alt="Artisan woodcarver working on a wooden sculpture"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover object-center"
                                priority
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-start text-left">
                        <span className="block text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-[#c89b5d] uppercase mb-4">
                            Our Story
                        </span>

                        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight mb-6 tracking-tight">
                            Preserving Heritage <br className="hidden sm:inline" />
                            Through Craftsmanship
                        </h2>

                        <p className="font-secondary text-xs sm:text-sm leading-relaxed  max-w-xl mb-5 opacity-90">
                            Founded in 2026, Matina Crafts was created with a mission to connect skilled Nepalese artisans with customers around the world. Every product is handcrafted in Nepal using traditional techniques passed down through generations.
                        </p>

                        <p className="font-secondary text-xs sm:text-sm leading-relaxed max-w-xl mb-8 opacity-90">
                            Our platform empowers local communities while preserving Nepal’s artistic heritage — making authentic craftsmanship accessible to collectors, designers, and conscious shoppers globally.
                        </p>

                        <div>
                            <Button variant="secondary" onClick={() => window.location.href = '/our-story'}>
                                Read our full story
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Story;