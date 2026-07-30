'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { subscribeNewsletter } from '@/lib/api';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await subscribeNewsletter(email);
      setStatus('ok');
      setMessage(res?.message || 'Thanks for subscribing!');
      setEmail('');
    } catch (err) {
      setStatus('err');
      setMessage(err instanceof Error ? err.message : 'Could not subscribe');
    }
  }

  return (
    <footer className="w-full select-none mt-auto">
      <div className="w-full relative flex justify-center overflow-hidden pt-6">
        <div className="relative w-full max-w-[1800px] h-[120px] sm:h-[180px] md:h-[220px] lg:h-[240px]">
          <Image
            src="/images/footer/footer.png"
            alt="Nepal Landmarks Illustration"
            fill
            sizes="100vw"
            className="object-cover object-bottom"
            priority
          />
        </div>
      </div>

      <div className="w-full bg-[#FEECE0] rounded-t-[40px] md:rounded-t-[50px] text-[#2A170F] pt-16 pb-16 md:pb-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

            {/* Column 1: Logo & About */}
            <div className="flex flex-col gap-5">
              <div className="relative w-[130px] h-[50px]">
                <Image
                  src="/images/logo/Vector.png"
                  alt="Matina Crafts Logo"
                  fill
                  sizes="130px"
                  className="object-contain object-left"
                  priority
                />
              </div>

              <p className="font-secondary text-xs sm:text-sm leading-relaxed text-[#664132] max-w-xs mt-2">
                We take pride in creating everyday products ethically and aesthetically. Completely hand made in Nepal.
              </p>

              <div className="flex flex-col gap-2 mt-3 font-secondary text-xs sm:text-sm text-[#2A170F]">
                <p className="flex items-center gap-1">
                  <span className="font-semibold">Email:</span>
                  <a
                    href="mailto:matinacrafts@gmail.com"
                    className="text-[#664132] hover:text-primary transition-colors"
                  >
                    matinacrafts@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="flex flex-col gap-5 lg:pl-10">
              <h4 className="font-sans text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                ABOUT US
              </h4>
              <nav className="flex flex-col gap-3 font-secondary text-xs sm:text-sm">
                <Link href="/products" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Shop
                </Link>
                <Link href="/about" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  About Us
                </Link>
                <Link href="/blog" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Journal
                </Link>
                <Link href="/newsletter" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Newsletter
                </Link>
                <Link href="/privacy" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Terms of Service
                </Link>
              </nav>
            </div>

            {/* Column 3: Newsletter */}
            <div className="flex flex-col gap-5">
              <h4 className="font-sans text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                JOIN OUR NEWSLETTER
              </h4>
              <div className="max-w-xs w-full mt-1">
                <form
                  onSubmit={handleSubscribe}
                  className="relative flex items-center border-b border-[#2A170F]/20 py-2 focus-within:border-[#2A170F] transition-colors duration-300"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status !== 'idle') setStatus('idle');
                    }}
                    placeholder="Your e-mail"
                    className="bg-transparent font-secondary text-xs sm:text-sm w-full focus:outline-none placeholder-[#2A170F]/45 pr-8 text-[#2A170F]"
                    required
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="absolute right-0 p-1 hover:text-primary hover:translate-x-0.5 transition-all duration-300 cursor-pointer focus:outline-none disabled:opacity-50"
                    aria-label="Subscribe"
                  >
                    <Icon icon="lucide:arrow-right" className="w-4 h-4 text-[#2A170F]" />
                  </button>
                </form>
                {message ? (
                  <p
                    className={`mt-2 font-secondary text-xs ${
                      status === 'err' ? 'text-red-700' : 'text-[#664132]'
                    }`}
                  >
                    {message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Column 4: Social Connections */}
            <div className="flex flex-col gap-5 lg:pl-10">
              <h4 className="font-sans text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                FOLLOW US
              </h4>
              <div className="flex items-center gap-3 mt-1">
                <a
                  href="https://www.facebook.com/matinacrafts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-[#2A170F]/20 flex items-center justify-center text-[#2A170F] hover:bg-[#2A170F] hover:text-[#FEECE0] hover:border-[#2A170F] transition-all duration-300 focus:outline-none"
                  aria-label="Facebook"
                >
                  <Icon icon="ph:facebook-logo-light" className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/matinacrafts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-[#2A170F]/20 flex items-center justify-center text-[#2A170F] hover:bg-[#2A170F] hover:text-[#FEECE0] hover:border-[#2A170F] transition-all duration-300 focus:outline-none"
                  aria-label="Instagram"
                >
                  <Icon icon="ph:instagram-logo-light" className="w-5 h-5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
