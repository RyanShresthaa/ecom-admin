'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import CountryStateCityFields from '@/shared/ui/CountryStateCityFields';
import { useRouter } from 'next/navigation';
import { ApiError, createPaymentMethod } from '@/lib/api';

const NewCard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Form states for Live Card Preview
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  useEffect(() => {
    if (user?.name) setCardholderName(user.name);
  }, [user?.name]);

  // Billing address states
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [isDefault, setIsDefault] = useState(true);
  const [saveBilling, setSaveBilling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createPaymentMethod({
        type: 'card',
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryDate,
        cvv,
        cardholderName,
        billingZip: postalCode,
        is_default: isDefault,
      });
      router.push('/payments');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save card.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Format Card Number input with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  // Format Expiry Date MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiryDate(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiryDate(raw);
    }
  };

  return (
    <section className="min-h-screen bg-[#FAF6F2] pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 select-none">
      <div className="container-custom max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <ProfileSidebar active="payments" />

          {/* RIGHT MAIN CONTENT */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            
            {/* Header */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] tracking-tight">
                Add New Card
              </h1>
              <p className="font-secondary text-xs sm:text-sm text-body/80 mt-1">
                Add a credit or debit card to your account
              </p>
            </div>

            {/* Graphical Live Card Preview */}
            <div className="bg-[#2E2F33] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden max-w-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                    CARD TYPE
                  </span>
                  <div className="text-base font-mono font-bold tracking-widest text-white mt-1">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                </div>
                <Icon icon="ph:credit-card-bold" className="w-8 h-8 text-gray-300" />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                    Cardholder Name
                  </span>
                  <span className="text-sm font-bold font-mono uppercase text-white tracking-wider">
                    {cardholderName || 'YOUR NAME'}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                      Expires
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {expiryDate || 'MM/YY'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">
                      CVV
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {cvv ? '•••' : '•••'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Container (White Card) */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-primary/10">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error ? (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl">
                    {error}
                  </div>
                ) : null}
                
                {/* Section 1: Card Details */}
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#2A170F] mb-4">
                    Card Details
                  </h3>

                  <div className="flex flex-col gap-4">
                    {/* Card Number */}
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
                          placeholder="1234 5678 9012 3456"
                          required
                          className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Expiry & CVV */}
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
                            placeholder="MM / YY"
                            required
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
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="•••"
                            required
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

                {/* Section 2: Billing Address */}
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#2A170F] mb-4">
                    Billing Address
                  </h3>

                  <div className="flex flex-col gap-4">
                    {/* Cardholder Name */}
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

                    {/* Street Address & Apartment */}
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
                          required
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

                    {/* Country / State / City — USA & Nepal only */}
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

                    {/* Postal Code */}
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
                          required
                          className="w-full px-4 py-3 bg-white border border-[#E2D5C7] rounded-2xl text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkboxes Box 1: Default Method */}
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

                {/* Checkboxes Box 2: Save Billing Address */}
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

                {/* Security Notice Box */}
                <div className="p-4 bg-white border border-[#E2D5C7] rounded-2xl flex items-start gap-3 text-xs">
                  <Icon icon="ph:shield-check-bold" className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#2A170F] block">
                      Secure Payment
                    </span>
                    <p className="text-muted/80 text-[11px] leading-relaxed mt-0.5">
                      Your card information is encrypted and never stored on our servers. We use industry-standard security protocols.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Link
                    href="/payments"
                    className="w-full py-3.5 px-8 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center cursor-pointer"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-8 bg-[#7C4831] hover:bg-[#5C321E] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                        Adding Card...
                      </span>
                    ) : (
                      'Add Card'
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default NewCard;