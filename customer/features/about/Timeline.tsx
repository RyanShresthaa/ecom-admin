'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

interface TimelineEvent {
    year: string;
    title: string;
    description: string;
}

const timelineEvents: TimelineEvent[] = [
    {
        year: "2026",
        title: "Company Founded",
        description: "Matina Crafts launched with a mission to connect Nepalese artisans with the world."
    },
    {
        year: "2026",
        title: "First Artisan Partnerships",
        description: "Onboarded 50+ master craftspeople across Kathmandu, Patan, and Bhaktapur."
    },
    {
        year: "2026",
        title: "Global Shipping Launch",
        description: "Expanded worldwide delivery to 20+ countries across five continents."
    },
    {
        year: "2027",
        title: "International Community",
        description: "Grew to 10,000+ customers and featured in global design and lifestyle press."
    },
    {
        year: "2027+",
        title: "Future Vision",
        description: "Expanding to 500+ artisans and becoming the world's leading Nepalese handicraft marketplace."
    }
];

const Timeline = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const line = lineRef.current;
        if (!container) return;

        if (line) {
            gsap.fromTo(
                line,
                { scaleY: 0 },
                {
                    scaleY: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: container,
                        start: 'top 80%',
                        end: 'bottom 55%',
                        scrub: true,
                    },
                }
            );
        }


    }, []);

    return (
        <section className="w-full pb-16 sm:pb-24 md:pb-28 lg:pb-[6vw] select-none bg-background">
            <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto text-center">
                <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-primary-heading uppercase mb-4 lg:mb-[0.8vw]">
                    Our Journey
                </span>

                <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight text-primary-dark mb-16 md:mb-24 lg:mb-[4vw] tracking-tight">
                    A Story Still Being Written
                </h2>

                <div ref={containerRef} className="relative w-full max-w-5xl lg:max-w-none mx-auto">
                    <div className="absolute left-4 lg:left-1/2 top-4 bottom-4 w-px bg-primary/20 -translate-x-1/2" />

                    <div
                        ref={lineRef}
                        className="absolute left-4 lg:left-1/2 top-4 bottom-4 w-px bg-primary -translate-x-1/2 origin-top scale-y-0"
                    />

                    <div className="space-y-12 lg:space-y-[3vw]">
                        {timelineEvents.map((event, index) => {
                            const isEven = index % 2 === 0;
                            return (
                                <div
                                    key={index}
                                    className="timeline-row relative flex flex-col lg:grid lg:grid-cols-2 lg:gap-[3vw] items-start text-left w-full lg:max-w-none"
                                >
                                    <div className={`hidden lg:block w-full ${isEven ? 'text-right pr-12 lg:pr-[3vw]' : 'pointer-events-none'}`}>
                                        {isEven && (
                                            <div className="timeline-content flex flex-col items-end">
                                                <span className="text-[11px] sm:text-xs lg:text-[0.75vw] font-bold tracking-wider text-primary-heading uppercase mb-2 lg:mb-[0.4vw]">
                                                    {event.year}
                                                </span>
                                                <h3 className="font-heading text-lg sm:text-xl lg:text-[1.25vw] font-semibold text-primary-dark mb-3 lg:mb-[0.6vw]">
                                                    {event.title}
                                                </h3>
                                                <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/90 leading-relaxed lg:leading-[1.6vw] max-w-md lg:max-w-none w-full">
                                                    {event.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="timeline-node absolute left-4 lg:left-1/2 top-1.5 lg:top-[0.3vw] -translate-x-1/2 flex items-center justify-center z-10">
                                        <div className="w-12 h-12 lg:w-[2.8vw] lg:h-[2.8vw] rounded-full border border-primary/20 bg-background flex items-center justify-center shadow-xs">
                                            <div className="w-8 h-8 lg:w-[1.8vw] lg:h-[1.8vw] rounded-full bg-primary flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 lg:w-[0.35vw] lg:h-[0.35vw] rounded-full border border-background bg-transparent" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`w-full pl-12 lg:pl-[3vw] ${!isEven ? 'lg:text-left' : 'lg:hidden'}`}>
                                        <div className="timeline-content flex flex-col items-start">
                                            <span className="text-[11px] sm:text-xs lg:text-[0.75vw] font-bold tracking-wider text-primary-heading uppercase mb-2 lg:mb-[0.4vw]">
                                                {event.year}
                                            </span>
                                            <h3 className="font-heading text-lg sm:text-xl lg:text-[1.25vw] font-semibold text-primary-dark mb-3 lg:mb-[0.6vw]">
                                                {event.title}
                                            </h3>
                                            <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/90 leading-relaxed lg:leading-[1.6vw] max-w-md lg:max-w-none w-full">
                                                {event.description}
                                            </p>
                                        </div>
                                    </div>

                                    {isEven && <div className="hidden lg:block w-full" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Timeline;