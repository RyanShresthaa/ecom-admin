'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/shared/ui/Button';
import GoogleSignInButton from '@/shared/ui/GoogleSignInButton';
import ForgotPasswordFlow from '@/shared/ui/ForgotPasswordFlow';
import FlashToast, { type FlashToastTone } from '@/shared/ui/FlashToast';
import { sendTwoFactorEmailOtp } from '@/lib/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: FlashToastTone } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, googleLogin, completeTwoFactorLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isJustRegistered = searchParams.get('registered') === 'true';
  const isPasswordChanged = searchParams.get('passwordChanged') === 'true';

  const [twoFaToken, setTwoFaToken] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');

  const showToast = useCallback((message: string, tone: FlashToastTone = 'ok') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const finishLogin = () => {
    const next = searchParams.get('next') || '/';
    router.push(next);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires2fa) {
        setTwoFaToken(result.tempToken);
        setTwoFaCode('');
        return;
      }
      finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaToken) return;
    setError('');
    setLoading(true);
    try {
      await completeTwoFactorLogin(twoFaToken, twoFaCode.trim());
      setTwoFaToken(null);
      finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendTwoFaCode = async () => {
    if (!twoFaToken || resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await sendTwoFactorEmailOtp(twoFaToken);
      setTwoFaToken(result.tempToken);
      setTwoFaCode('');
      showToast(result.message);
      setResendCooldown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send code';
      setError(msg);
      showToast(msg, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('');
      const result = await googleLogin(credential);
      if (result?.requires2fa) {
        setTwoFaToken(result.tempToken);
        setTwoFaCode('');
        return;
      }
      finishLogin();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [googleLogin, router, searchParams],
  );

  return (
    <section className="h-screen max-h-screen bg-background flex items-center justify-center pt-16 sm:pt-20 pb-4 px-4 sm:px-6 lg:px-8 select-none overflow-hidden">
      {toast ? (
        <FlashToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className="container-custom max-w-4xl mx-auto w-full">
        <div className="bg-white/90 rounded-3xl border border-primary/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] lg:max-h-[580px]">
          <div className="lg:col-span-5 relative min-h-[180px] lg:min-h-full w-full overflow-hidden">
            <Image
              src="/images/hero/gallery/center-left.png"
              alt="Matina Crafts"
              fill
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="lg:col-span-7 bg-[#F7F0E9] p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative overflow-y-auto">
            <div className="flex items-center gap-8 border-b border-[#E5D7C8] pb-3 mb-5">
              <button
                type="button"
                className="relative text-base font-bold pb-1.5 transition-colors cursor-pointer text-[#1E2B4D]"
              >
                Login
                <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#1E2B4D] rounded-full" />
              </button>

              <Link
                href="/signup"
                className="relative text-base font-bold pb-1.5 transition-colors cursor-pointer text-muted hover:text-foreground"
              >
                Sign Up
              </Link>
            </div>

            {isJustRegistered && !error && (
              <div className="mb-4 p-2.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2">
                <Icon icon="lucide:check-circle" className="w-4 h-4 text-green-600 shrink-0" />
                <span>Account created successfully! Please log in to continue to checkout.</span>
              </div>
            )}

            {isPasswordChanged && !error && (
              <div className="mb-4 p-2.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2">
                <Icon icon="lucide:check-circle" className="w-4 h-4 text-green-600 shrink-0" />
                <span>Password changed successfully. Please log in with your new password.</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {twoFaToken ? (
              <form onSubmit={handleTwoFaSubmit} className="flex flex-col gap-3.5">
                <p className="text-xs text-body leading-relaxed">
                  Enter the 6-digit code from your authenticator app, or resend a backup code to
                  your email.
                </p>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5">
                    <Icon icon="ph:shield-check-bold" className="w-3.5 h-3.5 text-primary" />
                    Authenticator code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary tracking-[0.3em] text-center font-mono"
                  />
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading || twoFaCode.length < 6}
                  className="w-full mt-1.5 py-3 shadow-none! hover:shadow-none!"
                >
                  {loading ? 'Verifying…' : 'Verify & continue'}
                </Button>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={() => void handleResendTwoFaCode()}
                    className="text-xs font-semibold text-[#7C4831] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFaToken(null);
                      setTwoFaCode('');
                      setError('');
                      setResendCooldown(0);
                    }}
                    className="text-xs font-semibold text-[#1E2B4D] hover:underline cursor-pointer"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5">
                  <Icon icon="ph:envelope-simple-bold" className="w-3.5 h-3.5 text-primary" />
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5">
                  <Icon icon="ph:lock-simple-bold" className="w-3.5 h-3.5 text-primary" />
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-semibold text-[#1E2B4D] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="w-full mt-1.5 py-3 shadow-none! hover:shadow-none!"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'LOGIN'
                )}
              </Button>

              <div className="relative my-2 flex items-center justify-center">
                <div className="border-t border-[#E2D5C7] w-full" />
                <span className="bg-[#F7F0E9] px-3 text-[10px] font-bold tracking-wider text-muted uppercase shrink-0">
                  OR
                </span>
                <div className="border-t border-[#E2D5C7] w-full" />
              </div>

              <GoogleSignInButton
                mode="login"
                disabled={loading}
                onCredential={handleGoogleCredential}
              />

              <p className="text-center text-xs text-body mt-2">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-bold text-primary hover:underline cursor-pointer ml-1"
                >
                  Sign Up
                </Link>
              </p>
            </form>
            )}
          </div>
        </div>
      </div>

      {forgotModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative border border-primary/20">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>

            <ForgotPasswordFlow
              initialEmail={email}
              onClose={() => setForgotModalOpen(false)}
              onSuccess={() => {
                setForgotModalOpen(false);
                router.push('/login?passwordChanged=true');
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default Login;
