'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import CountryStateCityFields from '@/shared/ui/CountryStateCityFields';
import { useRouter } from 'next/navigation';
import { ApiError, createAddress } from '@/lib/api';
import {
  firstError,
  validateShippingAddress,
} from '@/lib/addressValidation';
import {
  formatUsPhoneInput,
  sanitizeNameInput,
  sanitizeSingleLine,
} from '@/lib/inputValidation';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';

const NewAddress: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { regionMode } = useShopLocale();

  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.name) setFullName(sanitizeNameInput(user.name));
  }, [user?.name]);
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [isShipping, setIsShipping] = useState(true);
  const [isBilling, setIsBilling] = useState(true);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const line = apartment.trim()
      ? `${street.trim()}, ${apartment.trim()}`
      : street.trim();
    const address_line = `[${addressType.toUpperCase()}] ${fullName.trim() || user.name} — ${line}`;

    const check = validateShippingAddress(
      {
        address_line: line || address_line,
        city: city.trim(),
        state: stateProvince.trim(),
        pincode: postalCode.trim(),
        country,
        mobile: phone.trim(),
      },
      regionMode,
    );

    if (!check.ok) {
      setError(firstError(check.errors) || 'Please fix the address fields.');
      return;
    }

    setLoading(true);
    try {
      await createAddress({
        address_line: `[${addressType.toUpperCase()}] ${fullName.trim() || user.name} — ${check.value.address_line}`,
        city: check.value.city,
        state: check.value.state,
        pincode: check.value.pincode,
        country: check.value.country,
        mobile: check.value.mobile,
      });
      router.push('/addresses');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save address.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] select-none">
      <div className="w-full lg:max-w-none mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-[2vw] items-start">
          <ProfileSidebar active="addresses" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 lg:gap-[1.5vw]">
            <div>
              <span className="text-[11px] lg:text-[0.7vw] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1 lg:mb-[0.3vw]">
                ACCOUNT
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.8vw] font-bold text-[#2A170F] tracking-tight">
                Add New Address
              </h1>
              <p className="font-secondary text-xs sm:text-sm lg:text-[0.85vw] text-body/80 mt-1 lg:mt-[0.3vw]">
                Add a new shipping or billing address to your account
              </p>
            </div>

            <div className="bg-white rounded-3xl lg:rounded-[1.5vw] p-6 sm:p-10 lg:p-[2.5vw] border border-primary/10">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 lg:gap-[1.5vw]">
                {error ? (
                  <div className="p-3 lg:p-[0.8vw] bg-red-50 border border-red-200 text-red-800 text-xs lg:text-[0.75vw] rounded-2xl lg:rounded-[1vw]">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="text-xs font-bold text-[#2A170F] block mb-3">Address Type</label>
                  <div className="grid grid-cols-3 gap-3 max-w-xl">
                    {(['Home', 'Office', 'Other'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressType(type)}
                        className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                          addressType === type
                            ? 'border-[#2A170F] bg-white text-[#2A170F] ring-1 ring-[#2A170F]'
                            : 'border-[#E2D5C7] bg-white text-muted hover:border-gray-400'
                        }`}
                      >
                        <Icon
                          icon={
                            type === 'Home'
                              ? 'ph:house-bold'
                              : type === 'Office'
                                ? 'ph:briefcase-bold'
                                : 'ph:map-pin-bold'
                          }
                          className="w-4 h-4"
                        />
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-[1.2vw]">
                  <div>
                    <label className="text-xs lg:text-[0.75vw] font-bold text-[#2A170F] block mb-2 lg:mb-[0.4vw]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(sanitizeNameInput(e.target.value))}
                      placeholder="Full name"
                      required
                      maxLength={80}
                      autoComplete="name"
                      className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] bg-white border border-[#E2D5C7] rounded-2xl lg:rounded-[0.8vw] text-xs sm:text-sm lg:text-[0.75vw] text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs lg:text-[0.75vw] font-bold text-[#2A170F] block mb-2 lg:mb-[0.4vw]">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(sanitizeSingleLine(e.target.value, 200))}
                      placeholder="123 Main St"
                      required
                      maxLength={200}
                      autoComplete="street-address"
                      className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] bg-white border border-[#E2D5C7] rounded-2xl lg:rounded-[0.8vw] text-xs sm:text-sm lg:text-[0.75vw] text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs lg:text-[0.75vw] font-bold text-[#2A170F] block mb-2 lg:mb-[0.4vw]">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          regionMode === 'nepal'
                            ? e.target.value.replace(/\D/g, '').slice(0, 10)
                            : formatUsPhoneInput(e.target.value),
                        )
                      }
                      placeholder={country === 'Nepal' ? '98XXXXXXXX' : '(415) 555-2671'}
                      required
                      maxLength={regionMode === 'nepal' ? 10 : 14}
                      inputMode="numeric"
                      autoComplete="tel"
                      className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] bg-white border border-[#E2D5C7] rounded-2xl lg:rounded-[0.8vw] text-xs sm:text-sm lg:text-[0.75vw] text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs lg:text-[0.75vw] font-bold text-[#2A170F] block mb-2 lg:mb-[0.4vw]">
                      Apartment, Suite, etc. (Optional)
                    </label>
                    <input
                      type="text"
                      value={apartment}
                      onChange={(e) => setApartment(sanitizeSingleLine(e.target.value, 80))}
                      placeholder="Apt 5B"
                      maxLength={80}
                      className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] bg-white border border-[#E2D5C7] rounded-2xl lg:rounded-[0.8vw] text-xs sm:text-sm lg:text-[0.75vw] text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <CountryStateCityFields
                    country={country}
                    state={stateProvince}
                    city={city}
                    onCountryChange={setCountry}
                    onStateChange={setStateProvince}
                    onCityChange={setCity}
                  />

                  <div>
                    <label className="text-xs lg:text-[0.75vw] font-bold text-[#2A170F] block mb-2 lg:mb-[0.4vw]">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) =>
                        setPostalCode(
                          regionMode === 'nepal'
                            ? e.target.value.replace(/\D/g, '').slice(0, 6)
                            : e.target.value.replace(/[^\d-]/g, '').slice(0, 10),
                        )
                      }
                      placeholder={country === 'Nepal' ? '44600' : '90210'}
                      required={regionMode !== 'nepal'}
                      maxLength={regionMode === 'nepal' ? 6 : 10}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      className="w-full px-4 lg:px-[1vw] py-3 lg:py-[0.6vw] bg-white border border-[#E2D5C7] rounded-2xl lg:rounded-[0.8vw] text-xs sm:text-sm lg:text-[0.75vw] text-[#2A170F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="my-2 border-t border-gray-100" />

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-[#2A170F]">Use this address for:</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2A170F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isShipping}
                        onChange={(e) => setIsShipping(e.target.checked)}
                        className="w-4 h-4 rounded border-[#E2D5C7] accent-[#7C4831] cursor-pointer"
                      />
                      <span>Shipping address</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2A170F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isBilling}
                        onChange={(e) => setIsBilling(e.target.checked)}
                        className="w-4 h-4 rounded border-[#E2D5C7] accent-[#7C4831] cursor-pointer"
                      />
                      <span>Billing address</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-[#FAF6F2] border border-primary/5 rounded-2xl">
                  <label className="flex items-center gap-3 text-xs font-bold text-[#2A170F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E2D5C7] accent-[#7C4831] cursor-pointer"
                    />
                    <span>Set as my default address</span>
                  </label>
                </div>

                <div className="my-2 border-t border-gray-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Link
                    href="/addresses"
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
                        Saving...
                      </span>
                    ) : (
                      'Save Address'
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

export default NewAddress;
