'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useParams } from 'next/navigation';
import UserAvatar from '@/shared/ui/UserAvatar';
import { ApiError, fetchPublicProfile, type PublicProfile } from '@/lib/api';

export default function PublicProfilePage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublicProfile(id);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Profile not found',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <main className="min-h-screen bg-[#FAF6F2] pt-24 pb-16 px-4 sm:px-6">
      <div className="container-custom max-w-3xl mx-auto">
        {loading && (
          <p className="text-center text-sm text-body/70 py-20">Loading profile…</p>
        )}

        {!loading && error && (
          <div className="bg-white rounded-3xl border border-primary/10 p-10 text-center">
            <Icon icon="ph:lock-key-bold" className="w-10 h-10 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#2A170F] mb-2">
              Profile unavailable
            </h1>
            <p className="text-sm text-body/70 mb-6">{error}</p>
            <Link
              href="/products"
              className="inline-flex px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider"
            >
              Continue shopping
            </Link>
          </div>
        )}

        {!loading && profile && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-primary/10 p-8 flex flex-col items-center text-center">
              <UserAvatar name={profile.name} avatar={profile.avatar} size={96} />
              <h1 className="font-heading text-3xl font-bold text-[#2A170F] mt-4">
                {profile.name}
              </h1>
              {memberSince && (
                <p className="text-xs text-muted mt-1">Member since {memberSince}</p>
              )}
              {profile.bio ? (
                <p className="font-secondary text-sm text-body/80 mt-4 max-w-lg leading-relaxed">
                  {profile.bio}
                </p>
              ) : (
                <p className="font-secondary text-sm text-body/50 mt-4">No bio yet.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-primary/10 p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold text-[#2A170F] mb-4">Reviews</h2>
              {profile.reviews.length === 0 ? (
                <p className="text-sm text-muted">No public reviews yet.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {profile.reviews.map((r) => (
                    <li
                      key={String(r.id)}
                      className="p-4 rounded-2xl bg-[#FAF6F2] border border-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-bold text-sm text-[#2A170F]">
                          {r.productName || `Product #${r.productId}`}
                        </span>
                        <span className="text-xs font-semibold text-amber-700">
                          {Number(r.rating).toFixed(1)} ★
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-body/80 leading-relaxed mt-1">{r.comment}</p>
                      )}
                      {r.createdAt && (
                        <p className="text-[10px] text-muted mt-2">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
