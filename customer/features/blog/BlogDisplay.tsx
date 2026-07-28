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
    <section className="w-full pt-16 md:pb-20 px-4 sm:px-6 md:px-12">
      <div className="w-full flex flex-col justify-center items-center text-center py-20">
        <h1 className="text-5xl md:text-7xl text-primary">Journal</h1>
        <p className="text-lg text-primary mt-4 max-w-xl">
          Stories, craft notes, and updates from Matina Crafts.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-primary/70 font-secondary pb-16">
          No journal posts yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex rounded-2xl flex-col border border-primary/50 overflow-hidden group transition-transform duration-300 hover:-translate-y-1"
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

              <div className="p-6 md:p-8 flex flex-col justify-between grow gap-6">
                <div className="flex flex-col gap-4">
                  <Link href={`/blog/${post.slug}`}>
                    <p className="text-xl md:text-2xl text-primary line-clamp-2 hover:text-primary-dark transition-colors cursor-pointer">
                      {post.title}
                    </p>
                  </Link>
                </div>

                <div className="pt-2 flex justify-between">
                  <Link href={`/blog/${post.slug}`} className="w-auto">
                    <Button className="w-auto cursor-pointer">Read More</Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-primary-dark/70 font-secondary">
                    <svg
                      className="w-4 h-4 text-primary/70 shrink-0"
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
