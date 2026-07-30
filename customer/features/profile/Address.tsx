'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/shared/context/AuthContext';
import ProfileSidebar from '@/shared/layout/ProfileSidebar';
import { ApiError, deleteAddress, fetchAddresses, type ApiAddress } from '@/lib/api';

export interface AddressItem {
  id: string;
  type: string;
  name: string;
  phone: string;
  street: string;
  apartment?: string;
  cityStateZip: string;
  country: string;
  isDefault: boolean;
  isShipping: boolean;
  isBilling: boolean;
}

function parseAddressLine(raw: string): { type: string; name: string; street: string } {
  const match = raw.match(/^\[([^\]]+)\]\s*(.*?)\s*—\s*(.*)$/);
  if (match) {
    return {
      type: match[1].trim() || 'HOME',
      name: match[2].trim() || '—',
      street: match[3].trim() || raw,
    };
  }
  return { type: 'HOME', name: '—', street: raw };
}

function mapApiAddress(row: ApiAddress, fallbackName: string, index: number): AddressItem {
  const parsed = parseAddressLine(String(row.address_line || ''));
  const city = row.city || '';
  const state = row.state || '';
  const zip = row.pincode || '';
  return {
    id: String(row.id ?? row._id ?? ''),
    type: parsed.type,
    name: parsed.name !== '—' ? parsed.name : fallbackName || '—',
    phone: String(row.mobile || '—'),
    street: parsed.street,
    cityStateZip: [city, state, zip].filter(Boolean).join(', '),
    country: row.country || '',
    isDefault: index === 0,
    isShipping: true,
    isBilling: true,
  };
}

const Address: React.FC = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetchAddresses();
        if (!cancelled) {
          setAddresses(rows.map((row, i) => mapApiAddress(row, user?.name || '', i)));
        }
      } catch (err) {
        if (!cancelled) {
          setAddresses([]);
          setError(err instanceof ApiError ? err.message : 'Could not load addresses.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.name]);

  if (!user) {
    return null;
  }

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
        isShipping: addr.id === id ? true : addr.isShipping,
        isBilling: addr.id === id ? true : addr.isBilling,
      })),
    );
    setNotification('Default address updated.');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      setNotification('Address removed.');
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete address.');
    }
  };

  return (
    <section className="min-h-screen bg-[#FAF6F2] pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 select-none">
      <div className="container-custom max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <ProfileSidebar active="addresses" />

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-heading block mb-1">
                  ACCOUNT
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2A170F] tracking-tight">
                  Saved Addresses
                </h1>
                <p className="font-secondary text-xs sm:text-sm text-body/80 mt-1">
                  Manage your shipping and billing addresses
                </p>
              </div>

              <Link
                href="/addresses/new"
                className="px-6 py-3 bg-[#7C4831] hover:bg-[#5C321E] text-white font-bold text-xs rounded-full transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xs active:scale-98"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                <span>Add New Address</span>
              </Link>
            </div>

            {notification ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                <Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notification}</span>
              </div>
            ) : null}

            {error ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {loading ? (
                <div className="md:col-span-2 bg-white rounded-3xl p-10 border border-primary/10 text-center text-xs text-muted">
                  Loading addresses…
                </div>
              ) : addresses.length === 0 ? (
                <div className="md:col-span-2 bg-white rounded-3xl p-10 border border-primary/10 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F7F0E9] text-primary flex items-center justify-center mx-auto mb-4">
                    <Icon icon="ph:map-pin" className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[#2A170F]">No addresses yet</h3>
                  <p className="font-secondary text-xs text-body/70 mt-1 mb-5 max-w-md mx-auto">
                    Add a shipping or billing address so checkout is faster.
                  </p>
                  <Link
                    href="/addresses/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#7C4831] hover:bg-[#5C321E] text-white font-bold text-xs rounded-full"
                  >
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                    Add New Address
                  </Link>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-white rounded-3xl p-6 border border-primary/10 flex flex-col justify-between transition-shadow hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#B87A5E]">
                          {addr.type}
                        </span>
                        {addr.isDefault ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <Icon icon="lucide:check" className="w-3 h-3" />
                            Default
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-heading text-lg font-bold text-[#2A170F]">{addr.name}</h3>
                      <p className="text-xs text-muted font-medium mt-0.5">{addr.phone}</p>

                      <div className="my-4 border-t border-gray-100" />

                      <div className="text-xs text-body leading-relaxed flex flex-col gap-0.5">
                        <p className="font-medium text-[#2A170F]">{addr.street}</p>
                        <p>{addr.cityStateZip}</p>
                        <p>{addr.country}</p>
                      </div>

                      <div className="my-4 border-t border-gray-100" />

                      <div className="flex items-center gap-3 text-xs text-muted mb-5">
                        {addr.isShipping ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#8C523A] bg-[#8C523A]" />
                            <span className="font-medium text-[#2A170F]">Shipping</span>
                          </div>
                        ) : null}
                        {addr.isBilling ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#8C523A] bg-[#8C523A]" />
                            <span className="font-medium text-[#2A170F]">Billing</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="grid grid-cols-2 gap-3">
                        <Link
                          href="/addresses/new"
                          className="py-2 px-4 bg-white border border-[#E2D5C7] hover:bg-gray-50 text-[#2A170F] text-xs font-semibold rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Icon icon="ph:pencil-simple-bold" className="w-3.5 h-3.5 text-muted" />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(addr.id)}
                          className="py-2 px-4 bg-white border border-[#E2D5C7] hover:bg-red-50 text-red-700 text-xs font-semibold rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Icon icon="ph:trash-bold" className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete</span>
                        </button>
                      </div>
                      {!addr.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr.id)}
                          className="w-full py-2 px-4 bg-[#FAF6F2] hover:bg-[#F5ECE8] text-[#2A170F] text-xs font-semibold rounded-full transition-colors cursor-pointer"
                        >
                          Set as default
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Address;
