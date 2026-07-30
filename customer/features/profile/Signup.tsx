'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import { useRouter } from 'next/navigation';
import Button from '@/shared/ui/Button';
import GoogleSignInButton from '@/shared/ui/GoogleSignInButton';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, googleLogin } = useAuth();
  const router = useRouter();

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms and Conditions.');
      return;
    }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
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
      <div className="container-custom max-w-4xl mx-auto w-full">
        {/* Main Card Container */}
        <div className="bg-white/90 rounded-3xl border border-primary/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[85vh] lg:max-h-[580px]">
          
          {/* Left Column — Full Cover Image (No Text) */}
          <div className="lg:col-span-5 relative min-h-[140px] lg:min-h-full w-full overflow-hidden">
            <Image
              src="/images/hero/gallery/center-left.png"
              alt="Matina Crafts"
              fill
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
              priority
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-black/10" />
          </div>

          {/* Right Column — Auth Form Box */}
          <div className="lg:col-span-7 bg-[#F7F0E9] p-5 sm:p-7 lg:p-8 flex flex-col justify-center relative overflow-y-auto">
            
            {/* Tabs Header */}
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

            {/* Error Banner */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign Up Form */}
            <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-2.5">
              {/* Full Name Field */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                  <Icon icon="ph:user-bold" className="w-3.5 h-3.5 text-primary" />
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full px-3.5 py-2 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                  <Icon icon="ph:envelope-simple-bold" className="w-3.5 h-3.5 text-primary" />
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full px-3.5 py-2 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
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

              {/* Confirm Password Field */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#664132] mb-1">
                  <Icon icon="ph:lock-simple-bold" className="w-3.5 h-3.5 text-primary" />
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2 pr-10 bg-white/90 border border-[#E2D5C7] rounded-lg text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon icon={showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 my-0.5">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#E2D5C7] text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-body cursor-pointer">
                  I agree to the <span className="font-semibold text-[#1E2B4D]">Terms & Conditions</span>
                </label>
              </div>

              {/* Primary Button component from shared/ui/Button */}
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

              {/* Divider */}
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

              {/* Bottom Switcher */}
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default Signup;