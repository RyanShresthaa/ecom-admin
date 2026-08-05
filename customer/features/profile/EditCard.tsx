'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import CountryStateCityFields from '@/shared/ui/CountryStateCityFields';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ApiError,
  createPaymentMethod,
  deletePaymentMethod,
  fetchPaymentMethods,
  setDefaultPaymentMethod,
  type ApiPaymentMethod,
} from '@/lib/api';

const EditCard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const methodId = searchParams.get('id') || '';

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [maskedLast4, setMaskedLast4] = useState('');
  const [brandLabel, setBrandLabel] = useState('CARD');

  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [isDefault, setIsDefault] = useState(true);
  const [saveBilling, setSaveBilling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<ApiPaymentMethod | null>(null);

  useEffect(() => {
    if (user?.name && !cardholderName) setCardholderName(user.name);
  }, [user?.name, cardholderName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!methodId) {
        setLoadingMethod(false);
        setError('Missing payment method. Open Edit from your saved cards.');
        return;
      }
      setLoadingMethod(true);
      try {
        const rows = await fetchPaymentMethods();
        const found = rows.find((r) => String(r.id ?? r._id) === String(methodId));
        if (!found) {
          if (!cancelled) {
            setError('Payment method not found.');
            setMethod(null);
          }
          return;
        }
        if (cancelled) return;
        setMethod(found);
        const last4 = found.last4 || '••••';
        setMaskedLast4(last4);
        setCardNumber(`•••• •••• •••• ${last4}`);
        const month = found.exp_month != null ? String(found.exp_month).padStart(2, '0') : '';
        const year = found.exp_year != null ? String(found.exp_year).slice(-2) : '';
        setExpiryDate(month && year ? `${month}/${year}` : '');
        setCardholderName(found.billing_name || user?.name || '');
        setPostalCode(found.billing_zip || '');
        setIsDefault(Boolean(found.is_default ?? found.isDefault));
        setBrandLabel(String(found.brand || found.type || 'CARD').toUpperCase());
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load payment method.');
        }
      } finally {
        if (!cancelled) setLoadingMethod(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [methodId, user?.name]);

  if (!user) {
    return null;
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiryDate(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiryDate(raw);
    }
  };

  const digitsOnly = cardNumber.replace(/\D/g, '');
  const isReplacingCard = digitsOnly.length >= 13;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodId || !method) return;
    setError('');
    setLoading(true);
    try {
      if (isReplacingCard) {
        if (!cvv || cvv.length < 3) {
          setError('Enter the CVV for the new card.');
          setLoading(false);
          return;
        }
        if (!expiryDate || expiryDate.length < 4) {
          setError('Enter a valid expiry date (MM/YY).');
          setLoading(false);
          return;
        }
        await createPaymentMethod({
          type: 'card',
          cardNumber: digitsOnly,
          expiryDate,
          cvv,
          cardholderName,
          billingZip: postalCode,
          is_default: isDefault,
        });
        await deletePaymentMethod(methodId);
      } else {
        if (isDefault && !(method.is_default ?? method.isDefault)) {
          await setDefaultPaymentMethod(methodId);
        } else if (!isDefault && (method.is_default ?? method.isDefault)) {
          setError(
            'To remove default status, set another card as default from Payment Methods, or replace this card.',
          );
          setLoading(false);
          return;
        }
        // Billing display fields are not stored beyond name/zip on create;
        // without a full card re-entry we can only update default.
        if (cardholderName !== (method.billing_name || '') || postalCode !== (method.billing_zip || '')) {
          setError(
            'To update cardholder or billing ZIP, re-enter the full card number and CVV, then save.',
          );
          setLoading(false);
          return;
        }
      }
      router.push('/payments');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save changes.',
      );
    } finally {
      setLoading(false);
    }
  };

  const previewNumber = isReplacingCard
    ? cardNumber
    : maskedLast4
      ? `•••• •••• •••• ${maskedLast4}`
      : cardNumber || '•••• •••• •••• ••••';

  return (
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          <ProfileSidebar active="payments" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 lg:gap-[1.5vw]">
            <div>
              <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                Edit Payment Method
              </h1>
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                Update card details or set as default. Re-enter the full number to replace the card.
              </p>
            </div>

            {error ? (
              <div className="p-3 lg:p-[0.8vw] bg-red-50 border border-red-200 text-red-800 text-xs lg:text-[0.75vw] rounded-2xl lg:rounded-[1vw]">
                {error}
              </div>
            ) : null}

            {loadingMethod ? (
              <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-10 lg:p-[2.5vw] border border-primary/10 text-center text-xs lg:text-[0.75vw] text-muted">
                Loading card…
              </div>
            ) : (
              <>
                <div className="bg-[#2E2F33] text-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-8 lg:p-[2vw] shadow-md relative overflow-hidden w-full lg:max-w-none">
                  <div className="flex items-center justify-between mb-6 lg:mb-[1.5vw]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                        {brandLabel}
                      </span>
                      <div className="text-base font-mono font-bold tracking-widest text-white mt-1">
                        {previewNumber}
                      </div>
                    </div>
                    {isDefault ? (
                      <span className="px-3 py-1 bg-white/10 text-amber-300 text-[10px] font-bold rounded-full border border-amber-300/20 flex items-center gap-1">
                        <Icon icon="ph:star-bold" className="w-3 h-3" />
                        Default
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                        Cardholder Name
                      </span>
                      <span className="text-sm font-bold font-mono uppercase text-white tracking-wider">
                        {(cardholderName || '—').toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                          Expires
                        </span>
                        <span className="text-xs font-bold font-mono text-white">
                          {expiryDate || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                          CVV
                        </span>
                        <span className="text-xs font-bold font-mono text-white">•••</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-primary/10">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#2A170F] mb-4">
                        Card Details
                      </h3>

                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#2A170F] block mb-2">
                            Card Number
                          </label>
                          <div className="relative">
                            <Icon
                              icon="ph:credit-card-bold"
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                            />
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              onFocus={() => {
                                if (!isReplacingCard) setCardNumber('');
                              }}
                              placeholder="•••• •••• •••• 4829"
                              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                          </div>
                          <p className="text-[10px] text-muted mt-1.5">
                            Leave as masked to keep this card and only change default. Clear and type a
                            full number to replace it.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-[#2A170F] block mb-2">
                              Expiry Date
                            </label>
                            <div className="relative">
                              <Icon
                                icon="lucide:calendar"
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                              />
                              <input
                                type="text"
                                value={expiryDate}
                                onChange={handleExpiryChange}
                                placeholder="12/26"
                                required={isReplacingCard}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#2A170F] block mb-2">
                              CVV
                            </label>
                            <div className="relative">
                              <input
                                type="password"
                                maxLength={4}
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="•••"
                                required={isReplacingCard}
                                className="w-full pl-4 pr-10 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                              />
                              <Icon
                                icon="lucide:help-circle"
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/70 cursor-help"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-1" />

                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#2A170F] mb-4">
                        Billing Address
                      </h3>

                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#2A170F] block mb-2">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="Full name"
                            required
                            className="w-full px-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-[#2A170F] block mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={streetAddress}
                              onChange={(e) => setStreetAddress(e.target.value)}
                              placeholder="42 Regent Street"
                              className="w-full px-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#2A170F] block mb-2">
                              Apartment, Suite, etc.
                            </label>
                            <input
                              type="text"
                              value={apartment}
                              onChange={(e) => setApartment(e.target.value)}
                              placeholder="Apartment 5B"
                              className="w-full px-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <CountryStateCityFields
                            country={country}
                            state={stateProvince}
                            city={city}
                            onCountryChange={setCountry}
                            onStateChange={setStateProvince}
                            onCityChange={setCity}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-[#2A170F] block mb-2">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              placeholder={country === 'Nepal' ? '44600' : '90210'}
                              className="w-full px-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF6F2] border border-primary/5 rounded-2xl">
                      <label className="flex items-center gap-3 text-xs font-bold text-[#2A170F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-4 h-4 rounded border-[#E2D5C7] text-primary focus:ring-primary accent-[#7C4831] cursor-pointer"
                        />
                        <span>Set as my default payment method</span>
                      </label>
                    </div>

                    <div className="p-4 bg-[#FAF6F2] border border-primary/5 rounded-2xl">
                      <label className="flex items-center gap-3 text-xs font-bold text-[#2A170F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveBilling}
                          onChange={(e) => setSaveBilling(e.target.checked)}
                          className="w-4 h-4 rounded border-[#E2D5C7] text-primary focus:ring-primary accent-[#7C4831] cursor-pointer"
                        />
                        <span>Save billing address for future purchases</span>
                      </label>
                    </div>

                    <div className="p-4 bg-white border border-[#E2D5C7] rounded-2xl flex items-start gap-3 text-xs">
                      <Icon
                        icon="ph:shield-check-bold"
                        className="w-5 h-5 text-primary shrink-0 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-[#2A170F] block">Secure Payment</span>
                        <p className="text-muted/80 text-[11px] leading-relaxed mt-0.5">
                          Your card information is encrypted and never stored on our servers. We use
                          industry-standard security protocols.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <Link
                        href="/payments"
                        className="w-full py-3.5 px-8 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center cursor-pointer"
                      >
                        Cancel
                      </Link>

                      <button
                        type="submit"
                        disabled={loading || !method}
                        className="w-full py-3.5 px-8 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-70"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditCard;
