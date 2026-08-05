'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Button from '@/shared/ui/Button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const AboutHero = () => {
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
        <section className="w-full min-h-screen lg:h-screen lg:min-h-0 flex justify-center items-center select-none pt-16 lg:pt-[5vw] pb-6 lg:pb-[2vw]">
            <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none flex items-center justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[4vw] items-center w-full lg:max-w-none">

                    <div className="flex flex-col items-start text-left">

                        <div className="inline-flex items-center gap-2 lg:gap-[0.5vw] px-3 lg:px-[0.8vw] py-1.5 lg:py-[0.3vw] rounded-full bg-[#F5ECE8] border border-primary/10 text-xs lg:text-[0.7vw] text-primary font-semibold mb-4 lg:mb-[1vw]">
                            <span className="text-[10px] text-primary">
                                <Image src="/images/about/flags.png" alt='flag' width={20} height={10} className="w-5 lg:w-[1vw] h-auto" />
                            </span>
                            <span>Authentic Nepalese Handicrafts</span>
                        </div>

                        <h1 className="font-sans text-4xl sm:text-5xl lg:text-[3.2vw] leading-[1.12] text-tracking-tight mb-4 lg:mb-[1vw]">
                            Our Story Begins{' '} <br />
                            <span className="text-(--primary-heading) block sm:inline">With the hands</span>{' '} <br />
                            of Nepal.
                        </h1>

                        <p className="font-secondary text-sm sm:text-base lg:text-[0.8vw] leading-relaxed lg:leading-[1.5vw] max-w-lg lg:max-w-none w-full mb-6 lg:mb-[1.5vw]">
                            Matina Crafts was founded to bring the timeless beauty of Nepalese craftsmanship to homes around the world. Every piece represents culture, tradition, and generations of artisan expertise.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 lg:gap-[1vw]">

                            <Button variant="primary" onClick={() => window.location.href = '/shop'}>
                                Explore Collection
                            </Button>
                            <Button variant="secondary" onClick={() => window.location.href = '/shop'}>
                                Explore Collection
                            </Button>

                        </div>

                    </div>

                    <div className="relative w-full ml-auto flex flex-col items-end justify-center">

                        <div
                            ref={containerRef}
                            className="relative aspect-4/5 rounded-2xl lg:rounded-[1.4vw] overflow-hidden w-full max-h-[70vh] lg:max-h-[88vh]"
                        >
                            <div
                                ref={imageWrapperRef}
                                className="absolute top-[-15%] left-0 w-full h-[130%]"
                            >
                                <Image
                                    src="/images/about/about-hero.png"
                                    alt="Artisan woodcarving in Nepal"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </div>
                        <div className="absolute -bottom-4 lg:-bottom-[0.8vw] left-0 bg-white rounded-2xl lg:rounded-[0.8vw] p-3 lg:p-[0.8vw] flex items-center gap-3 lg:gap-[0.6vw] border border-[#f0ebe6] z-10 shadow-sm transition-transform duration-300 hover:scale-[1.03]">
                            <div className="w-9 h-9 lg:w-[2.2vw] lg:h-[2.2vw] rounded-full bg-[#F5ECE8] flex items-center justify-center text-primary shrink-0">
                                <Icon icon="ph:certificate-light" className="w-4 h-4 lg:w-[1.1vw] lg:h-[1.1vw]" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs lg:text-[0.7vw] font-bold text-primary leading-tight">Est. 2026</span>
                                <span className="text-[10px] lg:text-[0.6vw] text-[#9E7D6F] font-medium mt-0.5 lg:mt-[0.1vw]">Kathmandu, Nepal</span>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
};

export default AboutHero;