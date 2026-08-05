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
        <section className="w-full py-16 sm:py-24 md:py-28 lg:py-[6vw] select-none">
            <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[4vw] items-center w-full lg:max-w-none">

                    <div 
                        ref={containerRef}
                        className="relative w-full aspect-square md:aspect-4/3.5 rounded-2xl lg:rounded-[1.4vw] overflow-hidden"
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

                    <div className="flex flex-col items-start text-left w-full lg:max-w-none">
                        <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-[#c89b5d] uppercase mb-4 lg:mb-[0.8vw]">
                            Our Story
                        </span>

                        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight lg:leading-[1.15] mb-6 lg:mb-[1.5vw] tracking-tight">
                            Preserving Heritage <br className="hidden sm:inline" />
                            Through Craftsmanship
                        </h2>

                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] max-w-xl lg:max-w-none w-full mb-5 lg:mb-[1vw] opacity-90">
                            Founded in 2026, Matina Crafts was created with a mission to connect skilled Nepalese artisans with customers around the world. Every product is handcrafted in Nepal using traditional techniques passed down through generations.
                        </p>

                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] max-w-xl lg:max-w-none w-full mb-8 lg:mb-[2vw] opacity-90">
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