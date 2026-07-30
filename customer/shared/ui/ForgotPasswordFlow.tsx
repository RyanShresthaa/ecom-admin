'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  ApiError,
  requestPasswordReset,
  resetPasswordWithOtp,
  verifyForgotPasswordOtp,
} from '@/lib/api';
import FlashToast, { type FlashToastTone } from '@/shared/ui/FlashToast';

export type ForgotStep = 'email' | 'otp' | 'password' | 'done';

type Props = {
  /** Prefill and optionally lock the email field (e.g. logged-in settings). */
  initialEmail?: string;
  lockEmail?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  /** Called after password is successfully reset. */
  onSuccess?: () => void;
  className?: string;
};

const ForgotPasswordFlow: React.FC<Props> = ({
  initialEmail = '',
  lockEmail = false,
  onClose,
  onBack,
  onSuccess,
  className = '',
}) => {
  const [step, setStep] = useState<ForgotStep>(lockEmail && initialEmail ? 'email' : 'email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: FlashToastTone } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const showToast = useCallback((message: string, tone: FlashToastTone = 'ok') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      showToast(`We emailed a 6-digit code to ${trimmed}. Check inbox and spam.`);
      setStep('otp');
      setOtp('');
      setResendCooldown(60);
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not send code';
      setError(msg);
      showToast(msg, 'err');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyForgotPasswordOtp({ email: email.trim(), otp: otp.trim() });
      showToast('Code verified. Choose a new password.');
      setStep('password');
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Invalid or expired code',
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must include uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPasswordWithOtp({
        email: email.trim(),
        newPassword,
        confirmPassword,
      });
      setStep('done');
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not reset password',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {toast ? (
        <FlashToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <h3 className="font-heading text-2xl font-bold text-[#2A170F] mb-2">Reset Password</h3>
      <p className="text-xs text-body/80 mb-5">
        {step === 'email' && 'Enter your email and we will send a one-time code.'}
        {step === 'otp' && 'Enter the 6-digit code from your email.'}
        {step === 'password' && 'Set a new password for your account.'}
        {step === 'done' && 'Your password has been updated.'}
      </p>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {step === 'email' && (
        <form onSubmit={sendOtp} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5 block">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              readOnly={lockEmail}
              className="w-full px-4 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-sm text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:opacity-80"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-semibold text-[#7C4831] hover:underline cursor-pointer"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-70 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send code'
              )}
            </button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5 block">
              One-time code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              required
              className="w-full px-4 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-sm text-[#2A170F] tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={loading || resendCooldown > 0}
              onClick={() => void sendOtp()}
              className="text-xs font-semibold text-[#7C4831] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="px-6 py-2.5 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-70 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify code'
              )}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={resetPassword} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5 block">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="w-full pl-4 pr-10 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-sm text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted cursor-pointer"
              >
                <Icon icon={showNew ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1.5 block">
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full pl-4 pr-10 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-sm text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted cursor-pointer"
              >
                <Icon icon={showConfirm ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs text-center">
          <Icon icon="lucide:check-circle" className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          Password updated. You can sign in with your new password.
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-5 py-2.5 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold rounded-full cursor-pointer"
            >
              Done
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordFlow;
