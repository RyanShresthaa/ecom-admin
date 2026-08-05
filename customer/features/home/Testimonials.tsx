'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { fetchGoogleReviews, type GoogleReview } from '@/lib/api';

const animationDurations = [35, 28, 32, 26];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5 lg:gap-[0.1vw]">
    {Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg lg:text-[1vw] ${i < rating ? 'text-amber-400' : 'text-gray-200'}`}
      >
        ★
      </span>
    ))}
  </div>
);

const TestimonialCard = ({ t }: { t: GoogleReview }) => (
  <div className="bg-white rounded-2xl lg:rounded-[1.2vw] p-5 sm:p-6 lg:p-[1.2vw] mb-4 lg:mb-[1vw] border border-[#f0ebe6] shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_6px_20px_rgba(140,82,58,0.08)]">
    <div className="flex items-center justify-between gap-3 lg:gap-[0.6vw] mb-4 lg:mb-[0.8vw]">
      <div
        className="w-10 h-10 lg:w-[2.4vw] lg:h-[2.4vw] rounded-full flex items-center justify-center text-white text-xs lg:text-[0.75vw] font-semibold shrink-0 ring-2 ring-white shadow-sm"
        style={{ backgroundColor: t.color }}
      >
        {t.initials}
      </div>
      <div className="min-w-0">
        <span className="text-sm lg:text-[0.85vw] font-semibold text-[#2A170F]">{t.name}</span>
        {t.role ? <span className="text-xs lg:text-[0.7vw] text-[#9E7D6F] ml-1.5 lg:ml-[0.3vw]">– {t.role}</span> : null}
      </div>
    </div>

    <p className="text-[13px] sm:text-sm lg:text-[0.8vw] leading-relaxed lg:leading-[1.5vw] text-[#664132] mb-4 lg:mb-[0.8vw]">
      &ldquo;{t.text}&rdquo;
    </p>

    <StarRating rating={t.rating} />
  </div>
);

function groupIntoColumns(reviews: GoogleReview[]): GoogleReview[][] {
  const cols: GoogleReview[][] = [[], [], [], []];
  for (const r of reviews) {
    const idx = Math.min(3, Math.max(0, Number(r.columnIndex) || 0));
    cols[idx].push(r);
  }
  // If some columns empty (admin hid a whole column), redistribute for a fuller grid
  const nonEmpty = cols.filter((c) => c.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length < 4 && reviews.length >= 4) {
    const redistributed: GoogleReview[][] = [[], [], [], []];
    reviews.forEach((r, i) => {
      redistributed[i % 4].push(r);
    });
    return redistributed;
  }
  return cols;
}

const Testimonials = () => {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchGoogleReviews();
        if (!cancelled) setReviews(rows);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(() => groupIntoColumns(reviews), [reviews]);

  if (loaded && reviews.length === 0) return null;

  return (
    <section className="w-full py-16 sm:pb-20 md:pb-24 lg:py-[6vw] select-none overflow-hidden">
      <style>{`
        @keyframes testimonialUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes testimonialDown {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .testimonial-col:hover .testimonial-track {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">
        <div className="text-center mb-12 sm:mb-16 lg:mb-[3vw] flex flex-col items-center w-full lg:max-w-none">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2vw] font-normal leading-tight lg:leading-[1.1] tracking-tight text-[#2A170F] mb-4 lg:mb-[0.8vw]">
            What Our{' '}
            <span className="text-(--primary-heading)">Customers Say</span>
          </h2>
          <p className="text-xs sm:text-sm lg:text-[0.85vw] leading-relaxed lg:leading-[1.6vw] text-[#664132] font-secondary max-w-md lg:max-w-none w-full mx-auto">
            Trusted by customers worldwide for authentic Nepalese craftsmanship and reliable delivery.
          </p>
        </div>

        {!loaded ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-[#9E7D6F] font-secondary">
            Loading reviews…
          </div>
        ) : (
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[1.2vw] w-full"
            style={{
              height: 'clamp(500px, 42vw, 800px)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
            }}
          >
            {columns.map((col, colIndex) =>
              col.length === 0 ? (
                <div key={colIndex} className="hidden lg:block" />
              ) : (
                <div key={colIndex} className="testimonial-col overflow-hidden h-full">
                  <div
                    className="testimonial-track flex flex-col"
                    style={{
                      animation: `${
                        colIndex % 2 === 0 ? 'testimonialDown' : 'testimonialUp'
                      } ${animationDurations[colIndex]}s linear infinite`,
                    }}
                  >
                    {[...col, ...col].map((t, i) => (
                      <TestimonialCard key={`${t.id}-${i}`} t={t} />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
