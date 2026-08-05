import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/shared/ui/Button';
import type { BlogPost } from './blogData';

type Props = {
  posts: BlogPost[];
};

const BlogDisplay: React.FC<Props> = ({ posts }) => {
  return (
    <section className="w-full pt-16 md:pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full flex flex-col justify-center items-center text-center py-16 sm:py-20 lg:py-[3vw]">
        <h1 className="text-5xl md:text-7xl lg:text-[4vw] text-primary tracking-tight">Journal</h1>
        <p className="text-lg lg:text-[0.85vw] text-primary mt-4 lg:mt-[0.8vw] max-w-xl lg:max-w-none w-full">
          Stories, craft notes, and updates from Matina Crafts.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="max-w-xl lg:max-w-[30vw] mx-auto bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-12 lg:p-[3vw] text-center mb-16 lg:mb-[4vw]">
          <div className="w-16 h-16 lg:w-[3.5vw] lg:h-[3.5vw] rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mx-auto mb-5 lg:mb-[1vw]">
            <span className="font-heading text-2xl lg:text-[1.5vw] text-primary">M</span>
          </div>
          <h2 className="font-heading text-2xl lg:text-[1.5vw] font-medium text-[#2A170F] mb-2 lg:mb-[0.5vw]">
            No journal posts yet
          </h2>
          <p className="font-secondary text-sm lg:text-[0.8vw] text-body/70">
            Check back soon for craft stories and updates from Matina Crafts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-[2vw] w-full lg:max-w-none mb-16 lg:mb-[5vw]">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex rounded-2xl lg:rounded-[1.2vw] flex-col border border-primary/50 overflow-hidden group transition-transform duration-300 hover:-translate-y-1 w-full lg:max-w-none"
            >
              <div className="relative aspect-2.5/2 w-full overflow-hidden">
                <Link href={`/blog/${post.slug}`}>
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover rounded-none transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Link>
              </div>

              <div className="p-6 md:p-8 lg:p-[1.5vw] flex flex-col justify-between grow gap-6 lg:gap-[1.5vw]">
                <div className="flex flex-col gap-4 lg:gap-[0.8vw]">
                  <Link href={`/blog/${post.slug}`}>
                    <p className="text-xl md:text-2xl lg:text-[1.2vw] text-primary line-clamp-2 hover:text-primary-dark transition-colors cursor-pointer leading-snug lg:leading-[1.4vw]">
                      {post.title}
                    </p>
                  </Link>
                </div>

                <div className="pt-2 lg:pt-[0.5vw] flex items-center justify-between gap-2">
                  <Link href={`/blog/${post.slug}`} className="w-auto">
                    <Button className="w-auto cursor-pointer">Read More</Button>
                  </Link>
                  <div className="flex items-center gap-2 lg:gap-[0.4vw] text-sm lg:text-[0.75vw] text-primary-dark/70 font-secondary">
                    <svg
                      className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/70 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-primary/80">{post.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default BlogDisplay;
