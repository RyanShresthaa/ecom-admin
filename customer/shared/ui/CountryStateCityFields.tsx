'use client';

import React, { useMemo } from 'react';
import SearchableSelect from '@/shared/ui/SearchableSelect';
import {
  COUNTRIES,
  cityOptions,
  isSupportedCountry,
  stateOptions,
} from '@/lib/geoLocations';

type Props = {
  country: string;
  state: string;
  city: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  /** Extra classes on selects (e.g. checkout cream background) */
  triggerClassName?: string;
  required?: boolean;
  /** When true, stack country / state / city in a simple column grid owned by parent */
  hideLabels?: boolean;
};

/**
 * Country (USA | Nepal) + searchable state/province + searchable city,
 * linked so city options follow the selected region.
 */
export default function CountryStateCityFields({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  triggerClassName,
  required = true,
}: Props) {
  const safeCountry = isSupportedCountry(country) ? country : 'United States';
  const states = useMemo(() => stateOptions(safeCountry), [safeCountry]);
  const cities = useMemo(() => cityOptions(safeCountry, state), [safeCountry, state]);

  const stateLabel = safeCountry === 'Nepal' ? 'Province' : 'State';
  const stateSearch = safeCountry === 'Nepal' ? 'Search province…' : 'Search state…';

  return (
    <>
      <div>
        <label className="text-xs font-bold text-[#2A170F] block mb-2">Country / Region</label>
        <SearchableSelect
          value={safeCountry}
          options={COUNTRIES.map((c) => ({ value: c, label: c }))}
          placeholder="Search country…"
          searchPlaceholder="Search country…"
          required={required}
          triggerClassName={triggerClassName}
          onChange={(next) => {
            onCountryChange(next);
            onStateChange('');
            onCityChange('');
          }}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-[#2A170F] block mb-2">{stateLabel}</label>
        <SearchableSelect
          value={state}
          options={states}
          placeholder={stateSearch}
          searchPlaceholder={stateSearch}
          required={required}
          triggerClassName={triggerClassName}
          onChange={(next) => {
            onStateChange(next);
            onCityChange('');
          }}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-[#2A170F] block mb-2">City</label>
        <SearchableSelect
          value={city}
          options={cities}
          placeholder={state ? 'Search city…' : `Select ${stateLabel.toLowerCase()} first`}
          searchPlaceholder="Search city…"
          required={required}
          disabled={!state}
          triggerClassName={triggerClassName}
          emptyMessage={state ? 'No cities match' : `Pick a ${stateLabel.toLowerCase()} first`}
          onChange={onCityChange}
        />
      </div>
    </>
  );
}
