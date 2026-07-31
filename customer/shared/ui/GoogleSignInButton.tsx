'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { getGoogleClientId, renderGoogleButton } from '@/lib/googleGis';

type Props = {
  mode: 'login' | 'signup';
  onCredential: (credential: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
};

/**
 * Custom-looking Google button with an official GIS button overlaid on top
 * so the real Google account picker / consent flow runs.
 */
export default function GoogleSignInButton({
  mode,
  onCredential,
  disabled = false,
  className = '',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [pageOrigin, setPageOrigin] = useState('');

  onCredentialRef.current = onCredential;

  const label = mode === 'signup' ? 'Sign up with Google' : 'Login with Google';
  const gsiText = mode === 'signup' ? 'signup_with' : 'signin_with';

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const clientId = getGoogleClientId();
    const host = hostRef.current;
    if (!host) return;

    if (!clientId) {
      setError('Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).');
      setReady(false);
      return;
    }

    let cancelled = false;
    setError('');
    setReady(false);

    const originBlockedHint = () => {
      const origin = window.location.origin;
      return (
        `Google rejected this page origin (${origin}). ` +
        `Open Google Cloud → APIs & Services → Credentials → the Web client matching this ID → ` +
        `Authorized JavaScript origins, add exactly "${origin}" and "http://localhost" (no trailing slash), Save, wait 2–5 min.`
      );
    };

    const mount = async () => {
      try {
        await renderGoogleButton(host, {
          clientId,
          text: gsiText,
          onCredential: async (credential) => {
            if (cancelled || disabled) return;
            setBusy(true);
            setError('');
            try {
              await onCredentialRef.current(credential);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Google sign-in failed');
            } finally {
              setBusy(false);
            }
          },
          onError: (message) => {
            if (!cancelled) setError(message);
          },
        });
        if (!cancelled) setReady(true);

        // GIS logs origin errors to the console; surface a clear fix if the iframe never appears.
        window.setTimeout(() => {
          if (cancelled) return;
          const iframe = host.querySelector('iframe');
          if (!iframe) {
            setError(originBlockedHint());
            setReady(false);
          }
        }, 800);
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          setError(err instanceof Error ? err.message : 'Google sign-in failed to load');
        }
      }
    };

    void mount();

    let lastWidth = Math.floor(host.getBoundingClientRect().width || 0);
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (cancelled) return;
      const next = Math.floor(host.getBoundingClientRect().width || 0);
      if (Math.abs(next - lastWidth) < 24) return;
      lastWidth = next;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!cancelled) void mount();
      }, 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      if (host) host.innerHTML = '';
    };
  }, [gsiText, disabled]);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full min-h-[42px]">
        <div
          className={`w-full min-h-[42px] py-2.5 px-4 bg-white border border-[#E2D5C7] rounded-full flex items-center justify-center gap-3 text-xs font-semibold text-[#2A170F] pointer-events-none ${
            disabled || busy ? 'opacity-60' : ''
          }`}
          aria-hidden
        >
          {busy ? (
            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="truncate">{busy ? 'Connecting…' : label}</span>
        </div>

        <div
          ref={hostRef}
          className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-full [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full ${
            disabled || busy || !ready ? 'pointer-events-none opacity-0' : 'opacity-[0.02]'
          }`}
          aria-label={label}
        />
      </div>
      {error ? (
        <p className="mt-2 text-[11px] text-red-700 text-center leading-snug">{error}</p>
      ) : null}
      {process.env.NODE_ENV === 'development' && pageOrigin ? (
        <p className="mt-2 text-[10px] text-muted text-center leading-relaxed">
          Google JS origins must include{' '}
          <code className="text-[#2A170F] font-semibold">{pageOrigin}</code>
          {' '}and <code className="text-[#2A170F] font-semibold">http://localhost</code>
          {' '}on the Web client ending in <code>…ple7npfo</code>. Redirect URIs alone are not
          enough.
        </p>
      ) : null}
    </div>
  );
}
