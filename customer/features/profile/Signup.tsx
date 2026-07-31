'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import { useRouter } from 'next/navigation';
import Button from '@/shared/ui/Button';
import GoogleSignInButton from '@/shared/ui/GoogleSignInButton';
import FlashToast, { type FlashToastTone } from '@/shared/ui/FlashToast';
import { resendSignupVerifyEmail, verifySignupEmail } from '@/lib/api';
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizePasswordInput,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from '@/lib/inputValidation';

type SignupStep = 'form' | 'otp';

const PENDING_VERIFY_EMAIL_KEY = 'matina_pending_verify_email';

const Signup: React.FC = () => {
  const [step, setStep] = useState<SignupStep>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [toast, setToast] = useState<{ message: string; tone: FlashToastTone } | null>(null);

  const { signup, googleLogin } = useAuth();
  const router = useRouter();

  const showToast = useCallback((message: string, tone: FlashToastTone = 'ok') => {
    setToast({ message, tone });
  }, []);

  // Survive remounts / Strict Mode: resume OTP step if signup already succeeded.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY);
      if (pending) {
        setEmail(pending);
        setStep('otp');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const goToOtpStep = (nextEmail: string) => {
    const normalized = nextEmail.trim().toLowerCase();
    setEmail(normalized);
    setOtp('');
    setStep('otp');
    setResendCooldown(60);
    try {
      sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, normalized);
    } catch {
      /* ignore */
    }
    showToast(`We emailed a 6-digit code to ${normalized}. Check inbox and spam.`);
  };

  const clearPendingVerify = () => {
    try {
      sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameErr = validateName(name);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    const matchErr = validatePasswordMatch(password, confirmPassword);
    if (matchErr) {
      setError(matchErr);
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms and Conditions.');
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const result = await signup(name.trim(), trimmedEmail, password);
      // Always collect OTP unless backend explicitly skipped verification (AUTO_VERIFY_EMAIL).
      if (result.requiresEmailVerification === false) {
        clearPendingVerify();
        router.push('/login?registered=true');
        return;
      }
      goToOtpStep(result.email || trimmedEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifySignupEmail({ email: email.trim().toLowerCase(), otp: otp.trim() });
      clearPendingVerify();
      router.push('/login?verified=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const msg = await resendSignupVerifyEmail(email.trim().toLowerCase());
      showToast(msg || `We emailed a new code to ${email.trim().toLowerCase()}.`);
      setResendCooldown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend code';
      setError(msg);
      showToast(msg, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('');
      await googleLogin(credential);
      router.push('/');
    },
    [googleLogin, router],
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
        <div className="bg-white/90 rounded-3xl border border-primary/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[85vh] lg:max-h-[580px]">
          <div className="lg:col-span-5 relative min-h-[140px] lg:min-h-full w-full overflow-hidden">
            <Image
              src="/images/hero/gallery/center-left.png"
              alt="Matina Crafts"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="lg:col-span-7 bg-[#F7F0E9] p-5 sm:p-7 lg:p-8 flex flex-col justify-center relative overflow-y-auto">
            <div className="flex items-center gap-8 border-b border-[#E5D7C8] pb-2.5 mb-4">
              <Link
                href="/login"
                className="relative text-base font-bold pb-1 transition-colors cursor-pointer text-muted hover:text-foreground"
              >
                Login
              </Link>

              <button
                type="button"
                className="relative text-base font-bold pb-1 transition-colors cursor-pointer text-[#1E2B4D]"
              >
                Sign Up
                <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#1E2B4D] rounded-full" />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'otp' ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <div className="rounded-xl border border-[#E2D5C7] bg-white/70 px-3.5 py-3">
                  <p className="text-sm font-semibold text-[#1E2B4D]">Verify your email</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-body">
                    We sent a 6-digit code to{' '}
                    <span className="font-semibold text-[#2A170F]">{email}</span>. Enter it below
                    to activate your account, then sign in.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                    <Icon icon="ph:password-bold" className="w-3.5 h-3.5 text-primary" />
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/90 border border-[#E2D5C7] rounded-lg text-sm tracking-[0.35em] text-center font-mono text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-2.5 shadow-none! hover:shadow-none!"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'VERIFY EMAIL'
                  )}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={() => void handleResendOtp()}
                    className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      clearPendingVerify();
                      setStep('form');
                      setOtp('');
                      setError('');
                    }}
                    className="text-[11px] text-body hover:text-foreground"
                  >
                    Back to sign up
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-2.5">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                    <Icon icon="ph:user-bold" className="w-3.5 h-3.5 text-primary" />
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                    placeholder="John Doe"
                    required
                    maxLength={80}
                    autoComplete="name"
                    className="w-full px-3.5 py-2 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                    <Icon icon="ph:envelope-simple-bold" className="w-3.5 h-3.5 text-primary" />
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                    placeholder="john@example.com"
                    required
                    maxLength={320}
                    autoComplete="email"
                    className="w-full px-3.5 py-2 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                    <Icon icon="ph:lock-simple-bold" className="w-3.5 h-3.5 text-primary" />
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(sanitizePasswordInput(e.target.value))}
                      placeholder="••••••••"
                      required
                      maxLength={128}
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2 pr-10 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                    <Icon icon="ph:lock-simple-bold" className="w-3.5 h-3.5 text-primary" />
                    CONFIRM PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(sanitizePasswordInput(e.target.value))}
                      placeholder="••••••••"
                      required
                      maxLength={128}
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2 pr-10 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon
                        icon={showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'}
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 my-0.5">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E2D5C7] text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <label htmlFor="agreeTerms" className="text-[11px] text-body cursor-pointer">
                    I agree to the{' '}
                    <span className="font-semibold text-[#1E2B4D]">Terms & Conditions</span>
                  </label>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-2.5 shadow-none! hover:shadow-none!"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    'CREATE ACCOUNT'
                  )}
                </Button>

                <div className="relative my-1 flex items-center justify-center">
                  <div className="border-t border-[#E2D5C7] w-full" />
                  <span className="bg-[#F7F0E9] px-3 text-[10px] font-bold tracking-wider text-muted uppercase shrink-0">
                    OR
                  </span>
                  <div className="border-t border-[#E2D5C7] w-full" />
                </div>

                <GoogleSignInButton
                  mode="signup"
                  disabled={loading}
                  onCredential={handleGoogleCredential}
                />

                <p className="text-center text-xs text-body mt-1">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-primary hover:underline cursor-pointer ml-1"
                  >
                    Login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Signup;
