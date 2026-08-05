'use client';

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1500 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const elementRef = useRef<HTMLSpanElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    let startTimestamp: number | null = null;

                    const step = (timestamp: number) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

                        // Easing function - easeOutQuad
                        const easedProgress = progress * (2 - progress);

                        setDisplayValue(Math.floor(easedProgress * value));

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            setDisplayValue(value);
                        }
                    };

                    window.requestAnimationFrame(step);
                }
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            if (elementRef.current) {
                observer.unobserve(elementRef.current);
            }
        };
    }, [value, duration]);

    return <span ref={elementRef}>{displayValue}</span>;
};

const AboutStats = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.05 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, []);

    const stats = [
        {
            number: 500,
            suffix: '+',
            label: 'Artisans Supported',
        },
        {
            number: 100,
            suffix: '%',
            label: 'Made in Nepal',
        },
        {
            number: 30,
            suffix: '+',
            label: 'Craft Communities',
        },
        {
            number: 20,
            suffix: '+',
            label: 'Countries Served',
        },
        // {
        //     number: 1000,
        //     suffix: '+',
        //     label: 'Handcrafted Products',
        // },
    ];

    return (
        <section
            ref={containerRef}
            className="w-full bg-[#754626] py-16 sm:py-20 md:py-24 lg:py-[5vw] mt-16 lg:mt-[4vw] select-none relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.03)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto text-center relative z-10">

                <span className="block text-[11px] sm:text-xs lg:text-[0.75vw] font-semibold tracking-[0.25em] text-[#FAF7F4]/60 uppercase mb-4 lg:mb-[0.8vw]">
                    Our Reach
                </span>

                <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-medium text-white mb-12 sm:mb-16 lg:mb-[3vw] tracking-tight leading-tight">
                    Crafting Real-World Impact
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-[1.5vw] w-full lg:max-w-none">
                    {stats.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                opacity: isVisible ? 1 : 0,
                                transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                                transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
                            }}
                            className="group flex flex-col items-center justify-center p-6 sm:p-8 lg:p-[1.5vw] min-h-[150px] sm:min-h-[170px] lg:min-h-[10vw] rounded-2xl lg:rounded-[1.2vw] border border-white/10 bg-primary-light/30 backdrop-blur-3xl hover:scale-[1.03] transition-all duration-500 ease-out cursor-default w-full"
                        >
                            <div className="text-4xl sm:text-5xl lg:text-[2.6vw] font-bold text-white mb-3 lg:mb-[0.5vw] tracking-tight flex items-baseline justify-center font-sans">
                                <AnimatedNumber value={item.number} />
                                <span className="text-3xl sm:text-4xl lg:text-[2vw] font-semibold opacity-95 ml-0.5 lg:ml-[0.1vw]">
                                    {item.suffix}
                                </span>
                            </div>

                            <p className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] font-medium leading-relaxed text-[#FAF7F4]/80 text-center tracking-wide mt-1 lg:mt-[0.2vw]">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default AboutStats;