'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { subscribeNewsletter } from '@/lib/api';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await subscribeNewsletter(email, 'newsletter-page');
      setStatus('ok');
      setMessage(res?.message || 'Thanks for subscribing!');
      setEmail('');
    } catch (err) {
      setStatus('err');
      setMessage(err instanceof Error ? err.message : 'Could not subscribe');
    }
  }

  return (
    <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4 sm:px-6">
      <div className="container-custom max-w-xl mx-auto text-center">
        <p className="font-secondary text-xs uppercase tracking-[0.2em] text-[#664132]/70 mb-3">
          Stay in touch
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#2A170F] mb-4">
          Newsletter
        </h1>
        <p className="font-secondary text-sm sm:text-base text-[#664132] leading-relaxed mb-10">
          Occasional notes on new crafts, maker stories, and offers. No spam — unsubscribe anytime.
          We only use your email for this list (see our{' '}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          ).
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-primary/10 p-8 shadow-xs text-left"
        >
          <label htmlFor="newsletter-email" className="font-secondary text-xs font-semibold uppercase tracking-wider text-[#2A170F]">
            Email address
          </label>
          <div className="mt-2 flex items-center gap-2 border-b border-[#2A170F]/20 focus-within:border-[#2A170F] transition-colors">
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              disabled={status === 'loading'}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              placeholder="you@example.com"
              className="bg-transparent font-secondary text-sm w-full py-3 focus:outline-none text-[#2A170F] placeholder:text-[#2A170F]/40"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark disabled:opacity-60"
            >
              {status === 'loading' ? '…' : 'Subscribe'}
              <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
            </button>
          </div>
          {message ? (
            <p
              className={`mt-3 font-secondary text-sm ${
                status === 'err' ? 'text-red-700' : 'text-emerald-800'
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>

        <Link
          href="/products"
          className="inline-flex mt-10 font-secondary text-sm text-[#664132] hover:text-primary underline"
        >
          Browse the shop
        </Link>
      </div>
    </main>
  );
}
