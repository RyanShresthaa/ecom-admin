'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const MissionVision = () => {
    const missionContainerRef = useRef<HTMLDivElement>(null);
    const missionImageRef = useRef<HTMLDivElement>(null);
    const visionContainerRef = useRef<HTMLDivElement>(null);
    const visionImageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mission Image Parallax
        const mContainer = missionContainerRef.current;
        const mImage = missionImageRef.current;
        if (mContainer && mImage) {
            gsap.fromTo(
                mImage,
                { yPercent: -12, scale: 1.1 },
                {
                    yPercent: 12,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: mContainer,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                }
            );
        }

        // Vision Image Parallax
        const vContainer = visionContainerRef.current;
        const vImage = visionImageRef.current;
        if (vContainer && vImage) {
            gsap.fromTo(
                vImage,
                { yPercent: -12, scale: 1.1 },
                {
                    yPercent: 12,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: vContainer,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                }
            );
        }
    }, []);

    return (
        <section className="w-full pb-16 sm:pb-24 lg:pb-[6vw] select-none bg-background">
            <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">

                {/* Mission Card */}
                <div className="bg-white rounded-2xl lg:rounded-[1.5vw] overflow-hidden flex flex-col md:flex-row mb-16 md:mb-20 lg:mb-[4vw] border border-[#f0ebe6] w-full lg:max-w-none">
                    <div 
                        ref={missionContainerRef}
                        className="relative w-full md:w-1/3 aspect-4/3 md:aspect-2.5/3 min-h-[300px] md:min-h-[450px] lg:min-h-[28vw] overflow-hidden"
                    >
                        <div 
                            ref={missionImageRef}
                            className="absolute top-[-15%] left-0 w-full h-[130%]"
                        >
                            <Image
                                src="/images/about/mission.png"
                                alt="Nepalese temple pagoda"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover object-center"
                                priority
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-2/3 p-8 sm:p-12 md:p-16 lg:p-[3.5vw] flex flex-col justify-center items-start text-left bg-white">
                        <span className="text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-3 sm:mb-4 lg:mb-[0.8vw] block">
                            Our Mission
                        </span>
                        <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.4vw] font-normal leading-tight text-primary-dark mb-4 sm:mb-6 lg:mb-[1.2vw]">
                            Empower Artisans, Preserve Heritage
                        </h3>
                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-body mb-4 lg:mb-[0.8vw] w-full lg:max-w-none">
                            Founded in 2026, Matina Crafts was created with a mission to connect skilled Nepalese artisans with customers around the world. Every product is handcrafted in Nepal using traditional techniques passed down through generations.
                        </p>
                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-body mb-6 sm:mb-8 lg:mb-[1.8vw] w-full lg:max-w-none">
                            Our platform empowers local communities while preserving Nepal&apos;s artistic heritage making authentic craftsmanship accessible to collectors, designers, and conscious shoppers globally.
                        </p>
                        <a
                            onClick={() => window.location.href = '/our-story'}
                            className="inline-flex items-center gap-2 lg:gap-[0.5vw] font-secondary text-xs sm:text-sm lg:text-[0.85vw] font-semibold text-primary hover:text-primary-dark transition-colors group cursor-pointer"
                        >
                            <span>Read our full story</span>
                            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </a>
                    </div>
                </div>

                {/* Vision Card */}
                <div className="bg-white rounded-2xl lg:rounded-[1.5vw] overflow-hidden flex flex-col-reverse md:flex-row border border-[#f0ebe6] w-full lg:max-w-none">
                    <div className="w-full md:w-2/3 p-8 sm:p-12 md:p-16 lg:p-[3.5vw] flex flex-col justify-center items-start text-left bg-white">
                        <span className="text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-3 sm:mb-4 lg:mb-[0.8vw] block">
                            Our Vision
                        </span>
                        <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.4vw] font-normal leading-tight text-primary-dark mb-4 sm:mb-6 lg:mb-[1.2vw]">
                            The World's Most Trusted Nepalese Crafts Platform
                        </h3>
                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-body mb-4 lg:mb-[0.8vw] w-full lg:max-w-none">
                            To become the global destination where authentic Nepalese heritage meets conscious consumption. We envision a world where traditional craftspeople are celebrated, compensated fairly, and their legacies preserved for generations.
                        </p>
                        <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-body mb-6 sm:mb-8 lg:mb-[1.8vw] w-full lg:max-w-none">
                            By expanding to 500+ artisans and serving 50+ countries, Matina Crafts will be synonymous with ethical luxury—proving that beautiful design and social impact can flourish together.
                        </p>
                        <a
                            onClick={() => window.location.href = '/impact'}
                            className="inline-flex items-center gap-2 lg:gap-[0.5vw] font-secondary text-xs sm:text-sm lg:text-[0.85vw] font-semibold text-primary hover:text-primary-dark transition-colors group cursor-pointer"
                        >
                            <span>Explore our impact</span>
                            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </a>
                    </div>

                    <div 
                        ref={visionContainerRef}
                        className="relative w-full md:w-1/3 aspect-4/3 md:aspect-2.5/3 min-h-[300px] md:min-h-[450px] lg:min-h-[28vw] overflow-hidden"
                    >
                        <div 
                            ref={visionImageRef}
                            className="absolute top-[-5%] left-0 w-full h-[130%]"
                        >
                            <Image
                                src="/images/about/vision.png"
                                alt="Nepalese architecture with Nepal flag"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover object-top"
                                priority
                            />
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default MissionVision;