'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from './blogData';

interface BlogDetailProps {
    post: BlogPost;
}

const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
        case 'textiles':
        case 'weaving':
            return 'bg-[#F5ECE8] text-[#7C4831] border-[#E2D5C7]';
        case 'metalwork':
        case 'jewelry':
            return 'bg-amber-50 text-amber-900 border-amber-200/60';
        case 'woodwork':
        case 'carving':
            return 'bg-emerald-50 text-emerald-900 border-emerald-200/50';
        case 'studio notes':
        case 'behind the scenes':
            return 'bg-[#FAF6F2] text-[#2A170F] border-primary/20';
        case 'artisans':
        case 'makers':
            return 'bg-rose-50 text-rose-900 border-rose-200/50';
        default:
            return 'bg-primary/20 text-primary-dark border-primary/30';
    }
};

export default function BlogDetail({ post }: BlogDetailProps) {
    const categoryStyles = getCategoryStyles(post.category);

    return (
        <main className="w-full min-h-screen pt-24 pb-24 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none flex flex-col items-center">
            <div className="w-full max-w-5xl lg:max-w-none">
                {/* Back to blogs link */}
                <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 lg:gap-[0.5vw] text-xs md:text-sm lg:text-[0.75vw] text-primary/70 hover:text-primary transition-colors uppercase mb-8 lg:mb-[2vw] group"
                >
                    <svg
                        className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] transform rotate-180 transition-transform group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Back to blogs
                </Link>

                {/* Main Article Container */}
                <article className="w-full p-8 md:p-12 lg:p-[4vw] text-foreground flex flex-col gap-6 md:gap-8 lg:gap-[2vw]">
                    
                    <div className="text-sm lg:text-[0.75vw] font-light text-primary uppercase tracking-wider font-primary">
                        {post.date}
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-[3.5vw] text-primary font-heading -mt-2 lg:-mt-[0.5vw] leading-tight lg:leading-[1.15]">
                        {post.title}
                    </h1>

                    <div className="relative w-full aspect-3/2 overflow-hidden rounded-2xl lg:rounded-[1.4vw] border border-primary group my-2 lg:my-[0.5vw]">
                        <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            priority
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                        />
                    </div>

                    <h2 className="text-2xl md:text-3xl lg:text-[2vw] text-primary font-heading mt-2 lg:mt-[0.5vw]">
                        {post.subtitle}
                    </h2>

                    <p className="text-primary text-base md:text-lg lg:text-[0.9vw] leading-relaxed lg:leading-[1.6vw] -mt-4 lg:-mt-[0.8vw]">
                        {post.content}
                    </p>

                    {post.learnItems && post.learnItems.length > 0 && (
                        <div className="flex flex-col gap-6 lg:gap-[1.5vw] pt-4 lg:pt-[1vw] border-t border-border/50">
                            <h3 className="text-xl md:text-2xl lg:text-[1.5vw] text-primary font-heading">
                                {post.learnSectionTitle}
                            </h3>
                            
                            <ul className="flex flex-col gap-6 lg:gap-[1.2vw] list-none p-0 m-0">
                                {post.learnItems.map((item, idx) => (
                                    <li key={idx} className="flex flex-col gap-1 lg:gap-[0.3vw]">
                                        <p className="font-semibold text-primary text-base md:text-lg lg:text-[1vw] font-primary">
                                            {item.title}
                                        </p>
                                        <p className="text-primary text-base lg:text-[0.85vw] font-light leading-relaxed lg:leading-[1.5vw]">
                                            {item.description}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="text-primary text-base md:text-lg lg:text-[0.9vw] font-light leading-relaxed lg:leading-[1.6vw] pt-6 lg:pt-[1.5vw] border-t border-primary/50">
                        {post.conclusion}
                    </p>
                    
                </article>
            </div>
        </main>
    );
}
