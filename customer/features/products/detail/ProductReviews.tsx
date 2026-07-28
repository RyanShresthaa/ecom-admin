'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  ApiError,
  addProductReview,
  fetchProductReviews,
  hasSession,
  type ApiReview,
  type ReviewSummary,
} from '@/lib/api';

type Props = {
  productId: string;
  onSummary?: (summary: ReviewSummary) => void;
};

function Stars({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <div className="flex items-center text-[#c89b5d]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          icon={i < filled ? 'ph:star-fill' : 'ph:star'}
          className={size}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, onSummary }: Props) {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ count: 0, avg: 0 });
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ reviews: rows, summary: sum }, ok] = await Promise.all([
        fetchProductReviews(productId),
        hasSession(),
      ]);
      setReviews(rows);
      setSummary(sum);
      setLoggedIn(ok);
      onSummary?.(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, onSummary]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setOkMsg('');
    try {
      await addProductReview({ productId, rating, comment: comment.trim() });
      setComment('');
      setRating(5);
      setOkMsg('Thanks — your review was posted.');
      await load();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError('Sign in to leave a review.');
        setLoggedIn(false);
      } else {
        setError(err instanceof Error ? err.message : 'Could not submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16 pt-12 border-t border-primary/10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl text-primary-dark">Reviews</h2>
          <p className="font-secondary text-sm text-body/70 mt-1">
            What customers say about this piece.
          </p>
        </div>
        {!loading && summary.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={summary.avg} />
            <span className="font-secondary text-sm font-semibold text-primary-dark">
              {summary.avg.toFixed(2)}
            </span>
            <span className="font-secondary text-xs text-body/50">
              ({summary.count} review{summary.count === 1 ? '' : 's'})
            </span>
          </div>
        )}
      </div>

      {loading && (
        <p className="font-secondary text-sm text-body/60 py-6">Loading reviews…</p>
      )}

      {!loading && error && !reviews.length && (
        <p className="font-secondary text-sm text-red-600 py-4">{error}</p>
      )}

      {!loading && reviews.length === 0 && (
        <p className="font-secondary text-sm text-body/60 mb-8">
          No reviews yet. Be the first to share your experience.
        </p>
      )}

      <ul className="flex flex-col gap-5 mb-10">
        {reviews.map((r) => (
          <li
            key={String(r.id ?? r._id)}
            className="border-b border-primary/8 pb-5 last:border-0"
          >
            <div className="flex items-center gap-3 mb-2">
              <Stars value={Number(r.rating)} />
              <span className="font-secondary text-sm font-semibold text-primary-dark">
                {r.userName || 'Customer'}
              </span>
              {(r.createdAt || r.created_at) && (
                <span className="font-secondary text-[11px] text-body/45">
                  {new Date(String(r.createdAt || r.created_at)).toLocaleDateString()}
                </span>
              )}
            </div>
            {r.comment ? (
              <p className="font-secondary text-sm text-body/80 leading-relaxed">{r.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {loggedIn ? (
        <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-4">
          <h3 className="font-heading text-xl text-primary-dark">Write a review</h3>
          <div className="flex items-center gap-2">
            <span className="font-secondary text-xs uppercase tracking-wider text-body/60">
              Rating
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="text-[#c89b5d] p-0.5"
                  aria-label={`${n} stars`}
                >
                  <Icon
                    icon={n <= rating ? 'ph:star-fill' : 'ph:star'}
                    className="w-5 h-5"
                  />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share details about quality, craftsmanship, shipping…"
            className="w-full rounded-2xl border border-primary/25 bg-transparent px-4 py-3 font-secondary text-sm text-primary-dark placeholder:text-body/40 focus:outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-red-600 font-secondary">{error}</p>}
          {okMsg && <p className="text-sm text-emerald-700 font-secondary">{okMsg}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="self-start px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-60"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      ) : (
        <p className="font-secondary text-sm text-body/60">
          Sign in to leave a review once account login is available.
        </p>
      )}
    </section>
  );
}
