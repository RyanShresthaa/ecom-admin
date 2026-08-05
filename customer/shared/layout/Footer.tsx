'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { subscribeNewsletter } from '@/lib/api';
import { sanitizeEmailInput, validateEmail } from '@/lib/inputValidation';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    const emailErr = validateEmail(email);
    if (emailErr) {
      setStatus('err');
      setMessage(emailErr);
      return;
    }
    try {
      const res = await subscribeNewsletter(sanitizeEmailInput(email));
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
        <div className="relative w-full max-w-[1800px] lg:max-w-none h-[120px] sm:h-[180px] md:h-[220px] lg:h-[16vw]">
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

      <div className="w-full bg-[#FEECE0] rounded-t-[40px] md:rounded-t-[50px] lg:rounded-t-[3vw] text-[#2A170F] pt-16 pb-16 md:pb-24 lg:pt-[4vw] lg:pb-[5vw]">
        <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-[3vw]">

            {/* Column 1: Logo & About */}
            <div className="flex flex-col gap-5 lg:gap-[1vw]">
              <div className="relative w-[130px] h-[50px] lg:w-[9vw] lg:h-[3.5vw]">
                <Image
                  src="/images/logo/Vector.png"
                  alt="Matina Crafts Logo"
                  fill
                  sizes="130px"
                  className="object-contain object-left"
                  priority
                />
              </div>

              <p className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] leading-relaxed lg:leading-[1.5vw] text-[#664132] max-w-xs lg:max-w-none mt-2 lg:mt-[0.5vw]">
                We take pride in creating everyday products ethically and aesthetically. Completely hand made in Nepal.
              </p>

              <div className="flex flex-col gap-2 lg:gap-[0.4vw] mt-3 lg:mt-[0.6vw] font-secondary text-xs sm:text-sm lg:text-[0.8vw] text-[#2A170F]">
                <p className="flex items-center gap-1 lg:gap-[0.3vw]">
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
            <div className="flex flex-col gap-5 lg:gap-[1vw] lg:pl-[2vw]">
              <h4 className="font-sans text-[11px] sm:text-xs lg:text-[0.75vw] font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                QUICK LINKS
              </h4>
              <nav className="flex flex-col gap-3 lg:gap-[0.6vw] font-secondary text-xs sm:text-sm lg:text-[0.8vw]">
                <Link href="/" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Home
                </Link>
                <Link href="/products" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Shop
                </Link>
                <Link href="/about" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  About
                </Link>
                <Link href="/blog" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Blogs
                </Link>
                <Link href="/contact" className="text-[#664132] hover:text-primary transition-colors w-fit">
                  Contact
                </Link>
              </nav>
            </div>

            {/* Column 3: Newsletter */}
            <div className="flex flex-col gap-5 lg:gap-[1vw]">
              <h4 className="font-sans text-[11px] sm:text-xs lg:text-[0.75vw] font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                JOIN OUR NEWSLETTER
              </h4>
              <div className="max-w-xs lg:max-w-none w-full mt-1 lg:mt-[0.2vw]">
                <form
                  onSubmit={handleSubscribe}
                  className="relative flex items-center border-b border-[#2A170F]/20 py-2 lg:py-[0.5vw] focus-within:border-[#2A170F] transition-colors duration-300"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(sanitizeEmailInput(e.target.value));
                      if (status !== 'idle') setStatus('idle');
                    }}
                    placeholder="Your e-mail"
                    maxLength={320}
                    className="bg-transparent font-secondary text-xs sm:text-sm lg:text-[0.8vw] w-full focus:outline-none placeholder-[#2A170F]/45 pr-8 lg:pr-[2vw] text-[#2A170F]"
                    required
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="absolute right-0 p-1 hover:text-primary hover:translate-x-0.5 transition-all duration-300 cursor-pointer focus:outline-none disabled:opacity-50"
                    aria-label="Subscribe"
                  >
                    <Icon icon="lucide:arrow-right" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-[#2A170F]" />
                  </button>
                </form>
                {message ? (
                  <p
                    className={`mt-2 font-secondary text-xs lg:text-[0.75vw] ${
                      status === 'err' ? 'text-red-700' : 'text-[#664132]'
                    }`}
                  >
                    {message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Column 4: Social Connections */}
            <div className="flex flex-col gap-5 lg:gap-[1vw] lg:pl-[2vw]">
              <h4 className="font-sans text-[11px] sm:text-xs lg:text-[0.75vw] font-bold uppercase tracking-[0.2em] text-[#2A170F]">
                FOLLOW US
              </h4>
              <div className="flex items-center gap-3 lg:gap-[0.6vw] mt-1 lg:mt-[0.2vw]">
                <a
                  href="https://www.facebook.com/matinacrafts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 lg:w-[2.4vw] lg:h-[2.4vw] rounded-full border border-[#2A170F]/20 flex items-center justify-center text-[#2A170F] hover:bg-[#2A170F] hover:text-[#FEECE0] hover:border-[#2A170F] transition-all duration-300 focus:outline-none"
                  aria-label="Facebook"
                >
                  <Icon icon="ph:facebook-logo-light" className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw]" />
                </a>
                <a
                  href="https://www.instagram.com/matinacrafts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 lg:w-[2.4vw] lg:h-[2.4vw] rounded-full border border-[#2A170F]/20 flex items-center justify-center text-[#2A170F] hover:bg-[#2A170F] hover:text-[#FEECE0] hover:border-[#2A170F] transition-all duration-300 focus:outline-none"
                  aria-label="Instagram"
                >
                  <Icon icon="ph:instagram-logo-light" className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw]" />
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
