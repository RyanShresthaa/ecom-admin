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
        <section className="w-full h-screen flex justify-center items-center select-none">
            <div className="container-custom px-4 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    <div className="flex flex-col items-start text-left">

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5ECE8] border border-primary/10 text-xs text-primary font-semibold mb-6">
                            <span className="text-[10px] text-primary">
                                <Image src="/images/about/flags.png" alt='flag' width={20} height={10} />
                            </span>
                            <span>Authentic Nepalese Handicrafts</span>
                        </div>

                        <h1 className="font-sans text-4xl sm:text-6xl leading-[1.15] text-tracking-tight mb-6">
                            Our Story Begins{' '} <br />
                            <span className="text-(--primary-heading) block sm:inline">With the hands</span>{' '} <br />
                            of Nepal.
                        </h1>

                        <p className="font-secondary text-sm sm:text-base leading-relaxed max-w-lg mb-8">
                            Matina Crafts was founded to bring the timeless beauty of Nepalese craftsmanship to homes around the world. Every piece represents culture, tradition, and generations of artisan expertise.
                        </p>

                        <div className="flex flex-wrap items-center gap-4">

                            <Button variant="primary" onClick={() => window.location.href = '/shop'}>
                                Explore Collection
                            </Button>
                            {/* <Link
                                href="/artisans"
                                className="px-8 py-3.5 bg-transparent border border-[#8C523A] text-[#8C523A] font-semibold text-xs uppercase tracking-wider rounded-full hover:bg-[#8C523A] hover:text-white transition-all duration-300"
                            >
                                Meet Our Artisans
                            </Link> */}
                            <Button variant="secondary" onClick={() => window.location.href = '/shop'}>
                                Explore Collection
                            </Button>

                        </div>

                    </div>

                    <div className="relative w-full max-w-[500px] mx-auto lg:ml-45">

                        <div
                            ref={containerRef}
                            className="relative aspect-4/5 rounded-2xl overflow-hidden"
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
                        <div className="absolute -bottom-6 left-0 bg-white rounded-2xl p-4 flex items-center gap-3.5 border border-[#f0ebe6] z-10 transition-transform duration-300 hover:scale-[1.03]">
                            <div className="w-10 h-10 rounded-full bg-[#F5ECE8] flex items-center justify-center text-primary shrink-0">
                                <Icon icon="ph:certificate-light" className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-primary leading-tight">Est. 2026</span>
                                <span className="text-[10px] text-[#9E7D6F] font-medium mt-0.5">Kathmandu, Nepal</span>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
};

export default AboutHero;