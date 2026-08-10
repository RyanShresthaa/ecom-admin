'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  deleteAccount,
  disableTwoFactor,
  enableTwoFactor,
  exportAccountData,
  fetchNotificationPrefs,
  fetchUserProfile,
  setupTwoFactor,
  updateNotificationPrefs,
  updatePassword,
  type NotificationPrefs,
  type TwoFactorSetup,
} from '@/lib/api';
import { disableWebPush, enableWebPush, isPushSupported } from '@/lib/webPushClient';
import ForgotPasswordFlow from '@/shared/ui/ForgotPasswordFlow';

const DEFAULT_PREFS: NotificationPrefs = {
  orderUpdates: true,
  marketingEmails: false,
  reviewRequests: false,
  publicProfile: false,
  smsNotifications: false,
  pushNotifications: false,
  shareWishlist: false,
  totpEnabled: false,
  shareUrl: null,
  twilioConfigured: false,
  webPushConfigured: false,
};

type ComingSoonKey = 'personalizedRecs';

const AccountSetting: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof NotificationPrefs | null>(null);

  const [notification, setNotification] = useState('');
  const [notificationTone, setNotificationTone] = useState<'ok' | 'err'>('ok');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'change' | 'forgot'>('change');

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [hasMobile, setHasMobile] = useState(false);
  /** False for Google-only accounts until they set a local password. */
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [next, profile] = await Promise.all([
          fetchNotificationPrefs(),
          fetchUserProfile().catch(() => null),
        ]);
        if (!cancelled) {
          setPrefs(next);
          setTotpEnabled(Boolean(next.totpEnabled));
          setHasMobile(Boolean(String(profile?.mobile || '').trim()));
          setHasPassword(
            profile?.hasPassword === true ||
              profile?.has_password === true ||
              // If profile omitted the flag, keep Change Password (safer default).
              (profile?.hasPassword == null && profile?.has_password == null),
          );
        }
      } catch {
        if (!cancelled) setPrefs(DEFAULT_PREFS);
      } finally {
        if (!cancelled) setPrefsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  const showToast = (message: string, tone: 'ok' | 'err' = 'ok') => {
    setNotificationTone(tone);
    setNotification(message);
    setTimeout(() => setNotification(''), 4000);
  };

  const setPref = async <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    const previous = prefs;
    const optimistic = { ...prefs, [key]: value };
    setPrefs(optimistic);
    setSavingKey(key);
    try {
      if (key === 'pushNotifications' && value === true) {
        await enableWebPush();
      } else if (key === 'pushNotifications' && value === false) {
        await disableWebPush();
      }

      const saved = await updateNotificationPrefs({ [key]: value } as Partial<NotificationPrefs>);
      setPrefs(saved);

      if (key === 'orderUpdates') {
        showToast(
          value
            ? 'Order update emails enabled'
            : 'Order update emails disabled — you will not get confirmation/status emails',
        );
      } else if (key === 'marketingEmails') {
        showToast(value ? 'Marketing emails enabled' : 'Marketing emails disabled');
      } else if (key === 'reviewRequests') {
        showToast(
          value
            ? 'Review requests saved (emails when that campaign is available)'
            : 'Review request emails disabled',
        );
      } else if (key === 'publicProfile') {
        showToast(
          value
            ? `Public profile on — share /u/${user.id}`
            : 'Public profile off — your page is private',
        );
      } else if (key === 'smsNotifications') {
        showToast(
          value
            ? saved.twilioConfigured
              ? 'SMS notifications enabled'
              : 'SMS preference saved — Twilio credentials not set yet (sends will start once configured)'
            : 'SMS notifications disabled',
        );
      } else if (key === 'pushNotifications') {
        showToast(value ? 'Push notifications enabled' : 'Push notifications disabled');
      } else if (key === 'shareWishlist') {
        showToast(
          value
            ? 'Wishlist sharing on — copy the link below'
            : 'Wishlist sharing off — public link revoked',
        );
      } else {
        showToast('Preference saved');
      }
    } catch (err) {
      setPrefs(previous);
      showToast(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not save preference',
        'err',
      );
    } finally {
      setSavingKey(null);
    }
  };

  const copyShareUrl = async () => {
    const url = prefs.shareUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Wishlist share link copied');
    } catch {
      showToast('Could not copy link', 'err');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (hasPassword && !currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('Password must include uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword({
        ...(hasPassword ? { currentPassword } : {}),
        password: newPassword,
      });
      setHasPassword(true);
      setPasswordModalOpen(false);
      await logout();
      router.push('/login?passwordChanged=true');
    } catch (err) {
      setPasswordError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not update password',
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMode('change');
    setPasswordModalOpen(true);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matina-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Account data downloaded');
    } catch (err) {
      showToast(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not export data',
        'err',
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteAccount({
        confirm: 'DELETE',
        password: deletePassword || undefined,
      });
      // logout also wipes local cart/wishlist so a new signup on this browser stays clean
      await logout();
      router.push('/login?accountDeleted=true');
    } catch (err) {
      setDeleteError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not delete account',
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const ToggleSwitch = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-[#7C4831]' : 'bg-[#E2D5C7]'}`}
      aria-disabled={disabled}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );

  const comingSoon = (key: ComingSoonKey, title: string, description: string) => (
    <div
      key={key}
      className="p-4 bg-[#FAF6F2]/70 rounded-2xl border border-dashed border-primary/15 flex items-center justify-between gap-4 opacity-90"
    >
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">{title}</h4>
          <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#E2D5C7] text-[#664132]">
            Coming soon
          </span>
        </div>
        <p className="text-[11px] text-muted font-medium mt-0.5">{description}</p>
      </div>
      <ToggleSwitch checked={false} disabled onChange={() => undefined} />
    </div>
  );

  return (
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          <ProfileSidebar active="settings" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 lg:gap-[1.5vw]">
            <div>
              <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                Account Settings
              </h1>
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                Notification and privacy preferences sync to your account.
              </p>
            </div>

            {notification && (
              <div
                className={`p-3 lg:p-[0.8vw] text-xs lg:text-[0.75vw] rounded-2xl lg:rounded-[1vw] flex items-center gap-2 lg:gap-[0.4vw] border ${
                  notificationTone === 'err'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <Icon
                  icon={notificationTone === 'err' ? 'lucide:alert-circle' : 'lucide:check-circle'}
                  className={`w-4 h-4 lg:w-[1vw] lg:h-[1vw] shrink-0 ${
                    notificationTone === 'err' ? 'text-red-600' : 'text-emerald-600'
                  }`}
                />
                <span>{notification}</span>
              </div>
            )}

            <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-8 lg:p-[2vw] border border-primary/10 flex flex-col gap-5 lg:gap-[1.2vw]">
              <h3 className="font-heading text-lg lg:text-[1.2vw] font-bold text-[#2A170F]">
                Email & Communication
              </h3>

              <div className="flex flex-col gap-3">
                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">Order Updates</h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      Receive emails about order confirmation and shipment status
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.orderUpdates}
                    disabled={!prefsReady || savingKey === 'orderUpdates'}
                    onChange={(v) => void setPref('orderUpdates', v)}
                  />
                </div>

                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                      Marketing Emails
                    </h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      Opt in to the newsletter / offers list (synced with subscribers)
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.marketingEmails}
                    disabled={!prefsReady || savingKey === 'marketingEmails'}
                    onChange={(v) => void setPref('marketingEmails', v)}
                  />
                </div>

                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">Review Requests</h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      Preference saved on your account. Automated review-request emails are not
                      sent yet.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.reviewRequests}
                    disabled={!prefsReady || savingKey === 'reviewRequests'}
                    onChange={(v) => void setPref('reviewRequests', v)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-primary/10 flex flex-col gap-5">
              <h3 className="font-heading text-lg font-bold text-[#2A170F]">Privacy & Security</h3>
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-[11px] text-muted font-medium mt-0.5">
                        {totpEnabled
                          ? 'Enabled — open Google Authenticator / Authy at sign-in (no email code)'
                          : 'Uses an authenticator app (Google Authenticator, Authy) — not email'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={totpEnabled}
                      disabled={!prefsReady || twoFaBusy}
                      onChange={(on) => {
                        setTwoFaError('');
                        if (on) {
                          void (async () => {
                            setTwoFaBusy(true);
                            try {
                              const setup = await setupTwoFactor();
                              setTwoFaSetup(setup);
                              setTwoFaCode('');
                            } catch (err) {
                              showToast(
                                err instanceof Error ? err.message : 'Could not start 2FA setup',
                                'err',
                              );
                            } finally {
                              setTwoFaBusy(false);
                            }
                          })();
                        } else {
                          setDisableModalOpen(true);
                          setTwoFaCode('');
                          setTwoFaPassword('');
                        }
                      }}
                    />
                  </div>

                  {twoFaSetup && !totpEnabled && (
                    <div className="mt-1 p-4 bg-white rounded-xl border border-primary/10 flex flex-col sm:flex-row gap-4 items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={twoFaSetup.qrUrl}
                        alt="2FA QR code"
                        width={160}
                        height={160}
                        className="rounded-lg border border-primary/10 bg-white"
                      />
                      <div className="flex-1 w-full">
                        <p className="text-[11px] text-muted mb-2 leading-relaxed">
                          Scan the QR code, or enter this secret manually:
                        </p>
                        <code className="block text-[11px] break-all bg-[#FAF6F2] px-2 py-1.5 rounded-lg text-[#2A170F] mb-3">
                          {twoFaSetup.secret}
                        </code>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#664132] block mb-1.5">
                          Confirm with a 6-digit code
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={twoFaCode}
                            onChange={(e) =>
                              setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="123456"
                            className="flex-1 px-3 py-2 bg-[#FAF6F2] border border-[#E2D5C7] rounded-lg text-xs font-mono tracking-widest"
                          />
                          <button
                            type="button"
                            disabled={twoFaBusy || twoFaCode.length < 6}
                            onClick={() => {
                              void (async () => {
                                setTwoFaBusy(true);
                                setTwoFaError('');
                                try {
                                  await enableTwoFactor(twoFaCode);
                                  setTotpEnabled(true);
                                  setTwoFaSetup(null);
                                  setTwoFaCode('');
                                  showToast('Two-factor authentication enabled');
                                } catch (err) {
                                  setTwoFaError(
                                    err instanceof Error ? err.message : 'Invalid code',
                                  );
                                } finally {
                                  setTwoFaBusy(false);
                                }
                              })();
                            }}
                            className="px-4 py-2 rounded-full bg-[#7C4831] text-white text-xs font-bold disabled:opacity-50"
                          >
                            Enable 2FA
                          </button>
                        </div>
                        {twoFaError && (
                          <p className="text-[11px] text-red-600 mt-2">{twoFaError}</p>
                        )}
                        <button
                          type="button"
                          className="text-[11px] text-muted mt-2 hover:underline"
                          onClick={() => {
                            setTwoFaSetup(null);
                            setTwoFaCode('');
                            setTwoFaError('');
                          }}
                        >
                          Cancel setup
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">Public Profile</h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      Let others see your name, bio, and product reviews at{' '}
                      <span className="font-semibold text-[#2A170F]">/u/{user.id}</span>
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={prefs.publicProfile}
                    disabled={!prefsReady || savingKey === 'publicProfile'}
                    onChange={(v) => void setPref('publicProfile', v)}
                  />
                </div>

                {comingSoon(
                  'personalizedRecs',
                  'Personalized Recommendations',
                  'No recommendation engine that reads this preference.',
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-primary/10 flex flex-col gap-5">
              <h3 className="font-heading text-lg font-bold text-[#2A170F]">Preferences</h3>
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                        SMS Notifications
                      </h4>
                      <p className="text-[11px] text-muted font-medium mt-0.5">
                        {hasMobile
                          ? prefs.twilioConfigured
                            ? 'Order updates by text to your profile mobile number'
                            : 'Preference saved; SMS sends once Twilio credentials are configured'
                          : 'Add a mobile number in your profile first'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={prefs.smsNotifications}
                      disabled={!prefsReady || savingKey === 'smsNotifications' || !hasMobile}
                      onChange={(v) => void setPref('smsNotifications', v)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                        Push Notifications
                      </h4>
                      <p className="text-[11px] text-muted font-medium mt-0.5">
                        {!isPushSupported()
                          ? 'Not supported in this browser'
                          : prefs.webPushConfigured
                            ? 'Browser alerts for order updates (this device)'
                            : 'Server VAPID keys required before push can enable'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={prefs.pushNotifications}
                      disabled={
                        !prefsReady ||
                        savingKey === 'pushNotifications' ||
                        !isPushSupported() ||
                        (!prefs.webPushConfigured && !prefs.pushNotifications)
                      }
                      onChange={(v) => void setPref('pushNotifications', v)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-primary/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                        Share Wishlist
                      </h4>
                      <p className="text-[11px] text-muted font-medium mt-0.5">
                        Create a public link others can open without logging in
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={prefs.shareWishlist}
                      disabled={!prefsReady || savingKey === 'shareWishlist'}
                      onChange={(v) => void setPref('shareWishlist', v)}
                    />
                  </div>
                  {prefs.shareWishlist && prefs.shareUrl && (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <code className="flex-1 text-[11px] break-all bg-white px-3 py-2 rounded-lg border border-primary/10 text-[#2A170F]">
                        {prefs.shareUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyShareUrl()}
                        className="px-4 py-2 rounded-full bg-[#7C4831] text-white text-xs font-bold shrink-0"
                      >
                        Copy link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-primary/10 flex flex-col gap-5">
              <h3 className="font-heading text-lg font-bold text-[#2A170F]">Account Management</h3>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="p-4 bg-[#FAF6F2] hover:bg-[#F3EBE2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4 transition-colors cursor-pointer text-left w-full"
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                      {hasPassword ? 'Change Password' : 'Set Password'}
                    </h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      {hasPassword
                        ? 'Update your password regularly to keep your account secure'
                        : 'Create a password so you can sign in with email (not only Google)'}
                    </p>
                  </div>
                  <Icon icon="lucide:arrow-right" className="w-4 h-4 text-muted shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={exportLoading}
                  onClick={() => void handleExport()}
                  className="p-4 bg-[#FAF6F2] hover:bg-[#F3EBE2] rounded-2xl border border-primary/5 flex items-center justify-between gap-4 transition-colors cursor-pointer text-left w-full disabled:opacity-60"
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#2A170F]">
                      Download Your Data
                    </h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">
                      Get a JSON export of your profile, orders, addresses, cart, and wishlist
                    </p>
                  </div>
                  {exportLoading ? (
                    <Icon icon="lucide:loader-2" className="w-4 h-4 text-muted animate-spin" />
                  ) : (
                    <Icon icon="lucide:download" className="w-4 h-4 text-muted shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteError('');
                    setDeletePassword('');
                    setDeleteModalOpen(true);
                  }}
                  className="p-4 bg-red-50/60 hover:bg-red-100/50 rounded-2xl border border-red-200/80 flex items-center justify-between gap-4 transition-colors cursor-pointer text-left w-full"
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-red-700">Delete Account</h4>
                    <p className="text-[11px] text-red-600/80 font-medium mt-0.5">
                      Permanently delete your account and associated data
                    </p>
                  </div>
                  <Icon icon="lucide:trash-2" className="w-4 h-4 text-red-600 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full relative border border-primary/20 shadow-xl">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#F5ECE8] flex items-center justify-center text-[#7C4831] mb-4">
              <Icon
                icon={passwordMode === 'forgot' ? 'ph:envelope-simple-bold' : 'ph:lock-key-bold'}
                className="w-6 h-6"
              />
            </div>

            {passwordMode === 'forgot' ? (
              <ForgotPasswordFlow
                initialEmail={String(user.email || '')}
                lockEmail
                onBack={() => {
                  setPasswordMode('change');
                  setPasswordError('');
                }}
                onClose={() => setPasswordModalOpen(false)}
                onSuccess={async () => {
                  setPasswordModalOpen(false);
                  await logout();
                  router.push('/login?passwordChanged=true');
                }}
              />
            ) : (
              <>
                <h3 className="font-heading text-2xl font-bold text-[#2A170F] mb-1">
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </h3>
                <p className="text-xs text-muted mb-6">
                  {hasPassword
                    ? 'Enter your current password and a new secure password. You will be logged out upon completion.'
                    : 'Choose a password for email sign-in. Google sign-in will still work. You will be logged out when done.'}
                </p>

                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                  {hasPassword && (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-xs font-bold text-[#2A170F]">Current Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordMode('forgot');
                            setPasswordError('');
                          }}
                          className="text-[11px] font-semibold text-[#7C4831] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-4 pr-10 py-3 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                        >
                          <Icon
                            icon={showCurrentPassword ? 'lucide:eye-off' : 'lucide:eye'}
                            className="w-4 h-4"
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-[#2A170F] block mb-1.5">
                      {hasPassword ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        className="w-full pl-4 pr-10 py-3 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                      >
                        <Icon
                          icon={showNewPassword ? 'lucide:eye-off' : 'lucide:eye'}
                          className="w-4 h-4"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#2A170F] block mb-1.5">
                      {hasPassword ? 'Confirm New Password' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="w-full pl-4 pr-10 py-3 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                      >
                        <Icon
                          icon={showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'}
                          className="w-4 h-4"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(false)}
                      className="px-5 py-2.5 border border-[#E2D5C7] text-[#2A170F] text-xs font-semibold rounded-full hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-70"
                    >
                      {passwordLoading ? (
                        <>
                          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                          <span>{hasPassword ? 'Updating...' : 'Saving...'}</span>
                        </>
                      ) : hasPassword ? (
                        'Update & Sign Out'
                      ) : (
                        'Set Password & Sign Out'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full relative border border-red-200 shadow-xl">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-700 mb-4">
              <Icon icon="ph:warning-bold" className="w-6 h-6" />
            </div>

            <h3 className="font-heading text-2xl font-bold text-[#2A170F] mb-1">Delete account</h3>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              This permanently removes your account data. Google-only accounts may leave the
              password blank; password accounts must confirm with their password.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#2A170F] block mb-1.5">
                  Password (if you have one)
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs text-[#2A170F] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E2D5C7] text-[#2A170F] text-xs font-semibold rounded-full hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-70"
                >
                  {deleteLoading ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      <span>Deleting…</span>
                    </>
                  ) : (
                    'Delete permanently'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disableModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full relative border border-primary/20 shadow-xl">
            <button
              type="button"
              onClick={() => setDisableModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>
            <h3 className="font-heading text-2xl font-bold text-[#2A170F] mb-1">Disable 2FA</h3>
            <p className="text-xs text-muted mb-5 leading-relaxed">
              Enter a current authenticator code
              {user ? ' (and your password if you have one)' : ''} to turn off two-factor
              authentication.
            </p>
            {twoFaError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {twoFaError}
              </div>
            )}
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setTwoFaBusy(true);
                  setTwoFaError('');
                  try {
                    await disableTwoFactor({
                      code: twoFaCode,
                      password: twoFaPassword || undefined,
                    });
                    setTotpEnabled(false);
                    setDisableModalOpen(false);
                    setTwoFaCode('');
                    setTwoFaPassword('');
                    showToast('Two-factor authentication disabled');
                  } catch (err) {
                    setTwoFaError(err instanceof Error ? err.message : 'Could not disable 2FA');
                  } finally {
                    setTwoFaBusy(false);
                  }
                })();
              }}
            >
              <input
                type="text"
                inputMode="numeric"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Authenticator code"
                required
                className="w-full px-3 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs font-mono tracking-widest"
              />
              <input
                type="password"
                value={twoFaPassword}
                onChange={(e) => setTwoFaPassword(e.target.value)}
                placeholder="Account password (if any)"
                className="w-full px-3 py-2.5 bg-[#FAF6F2] border border-[#E2D5C7] rounded-xl text-xs"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setDisableModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#E2D5C7] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={twoFaBusy || twoFaCode.length < 6}
                  className="px-5 py-2 rounded-full bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {twoFaBusy ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default AccountSetting;
