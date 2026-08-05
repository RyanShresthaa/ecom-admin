'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';
import UserAvatar from '@/shared/ui/UserAvatar';
import { fetchMyOrders } from '@/lib/api';
import {
  formatMemberSince,
  pointsFromOrders,
  resolvePatronTier,
} from '@/lib/patronPoints';

type Active =
  | 'dashboard'
  | 'orders'
  | 'addresses'
  | 'payments'
  | 'settings'
  | 'invoice';

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
    </svg>
  );
}

/**
 * Shared account sidebar — always reflects the currently authenticated API user.
 */
export default function ProfileSidebar({ active }: { active: Active }) {
  const { user, logout, refreshUser, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [points, setPoints] = useState(0);
  const [pointsLoaded, setPointsLoaded] = useState(false);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser, pathname]);

  useEffect(() => {
    if (!user) {
      setPoints(0);
      setPointsLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const orders = await fetchMyOrders();
        if (!cancelled) setPoints(pointsFromOrders(orders));
      } catch {
        if (!cancelled) setPoints(0);
      } finally {
        if (!cancelled) setPointsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const patron = useMemo(() => resolvePatronTier(points), [points]);
  const memberSince = formatMemberSince(user?.createdAt);

  if (!isLoaded) {
    return (
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="bg-white rounded-3xl p-6 border border-primary/10 text-xs text-muted">
          Loading account…
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const item = (key: Active, href: string, icon: string, label: string) => {
    const isActive = active === key;
    return (
      <Link
        href={href}
        className={`w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] rounded-2xl lg:rounded-[0.8vw] flex items-center justify-between transition-colors cursor-pointer ${
          isActive ? 'bg-[#F5ECE8] text-[#4E291B]' : 'text-[#664132] hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 lg:gap-[0.8vw]">
          <Icon icon={icon} className={`w-4 h-4 lg:w-[1vw] lg:h-[1vw] ${isActive ? 'text-[#8C523A]' : 'text-muted'}`} />
          <span>{label}</span>
        </div>
        {isActive ? <span className="w-1.5 h-1.5 lg:w-[0.4vw] lg:h-[0.4vw] rounded-full bg-[#8C523A]" /> : null}
      </Link>
    );
  };

  return (
    <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 lg:gap-[1.5vw]">
      <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 lg:p-[1.5vw] border border-primary/10 flex flex-col items-center text-center">
        <div className="relative mb-4 lg:mb-[1vw] inline-flex">
          <UserAvatar name={user.name} avatar={user.avatar} size={80} />
          <span
            className="absolute bottom-0 right-0 w-7 h-7 lg:w-[1.8vw] lg:h-[1.8vw] rounded-full bg-[#5C321E] border-2 border-white flex items-center justify-center shadow-sm z-10"
            title={patron.tier.label}
            aria-label={patron.tier.label}
          >
            <CrownIcon className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw] text-[#E8C46A]" />
          </span>
        </div>
        <h2 className="font-heading text-lg lg:text-[1.1vw] font-bold text-[#2A170F]">{user.name}</h2>
        <p className="text-[11px] lg:text-[0.7vw] text-muted font-medium mt-0.5 break-all">{user.email}</p>
        {memberSince ? (
          <span className="text-[10px] lg:text-[0.65vw] text-muted/80 font-medium mt-1.5 block">
            Member since {memberSince}
          </span>
        ) : (
          <span className="text-[10px] lg:text-[0.65vw] text-muted/80 font-medium mt-1.5 block">
            Signed in — add your details anytime
          </span>
        )}

        <div className="w-full mt-5 lg:mt-[1.2vw] p-3.5 lg:p-[0.9vw] bg-[#5C321E] text-white rounded-2xl lg:rounded-[1vw] text-left">
          <div
            className="flex items-center gap-1.5 lg:gap-[0.4vw] text-[10px] lg:text-[0.65vw] font-bold uppercase tracking-wider"
            style={{ color: patron.tier.accent }}
          >
            <CrownIcon className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw] shrink-0" />
            <span>{patron.tier.label}</span>
          </div>
          <p className="text-[11px] lg:text-[0.7vw] font-semibold text-white mt-1.5 lg:mt-[0.4vw] leading-relaxed">
            {pointsLoaded ? patron.progressLabel : 'Loading points…'}
          </p>
          <div className="mt-2.5 lg:mt-[0.6vw] h-1.5 lg:h-[0.4vw] w-full rounded-full bg-[#3D1E10] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((pointsLoaded ? patron.progress : 0) * 100)}%`,
                backgroundColor: patron.tier.bar,
              }}
            />
          </div>
          <p className="text-[9px] lg:text-[0.6vw] text-white/55 mt-2 lg:mt-[0.5vw] leading-relaxed">
            Earn 1 point per $10 after payment and successful delivery.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-3 lg:p-[0.8vw] border border-primary/10 flex flex-col gap-1 lg:gap-[0.2vw] text-xs lg:text-[0.75vw] font-semibold">
        {item('dashboard', '/profile', 'ph:squares-four-bold', 'Dashboard')}
        {item('orders', '/orders', 'ph:package-bold', 'My Orders')}
        {item('addresses', '/addresses', 'ph:map-pin-bold', 'Addresses')}
        {item('payments', '/payments', 'ph:credit-card-bold', 'Payment Methods')}
        {item('settings', '/settings', 'ph:gear-bold', 'Account Settings')}
        <div className="my-1 border-t border-primary/10" />
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] rounded-2xl lg:rounded-[0.8vw] flex items-center gap-3 lg:gap-[0.8vw] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Icon icon="ph:sign-out-bold" className="w-4 h-4 lg:w-[1vw] lg:h-[1vw]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
