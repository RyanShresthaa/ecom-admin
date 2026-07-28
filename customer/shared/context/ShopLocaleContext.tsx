'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchShopSettings, formatMoney as formatMoneyStatic, type ShopSettings } from '@/lib/api';
import { applyShopSettingsToFx, toDisplayAmount } from '@/lib/currency';

type LocaleValue = {
  regionMode: 'us' | 'nepal';
  currency: string;
  timezone: string;
  usdNprRate: number;
  priceBaseCurrency: string;
  settings: ShopSettings;
  /** Format amount already in display currency. */
  formatMoney: (amount: number) => string;
  /** Convert catalog/base price → display currency, then format. */
  formatCatalogPrice: (baseAmount: number) => string;
  toDisplay: (baseAmount: number) => number;
  loading: boolean;
};

const LocaleContext = createContext<LocaleValue>({
  regionMode: 'us',
  currency: 'USD',
  timezone: 'America/New_York',
  usdNprRate: 133,
  priceBaseCurrency: 'NPR',
  settings: {},
  formatMoney: (n) => formatMoneyStatic(n, 'USD'),
  formatCatalogPrice: (n) =>
    formatMoneyStatic(
      toDisplayAmount(n, {
        currency: 'USD',
        price_base_currency: 'NPR',
        usd_npr_rate: 133,
        region_mode: 'us',
      }),
      'USD',
    ),
  toDisplay: (n) =>
    toDisplayAmount(n, {
      currency: 'USD',
      price_base_currency: 'NPR',
      usd_npr_rate: 133,
      region_mode: 'us',
    }),
  loading: true,
});

export function ShopLocaleProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed defaults immediately so early product maps convert NPR → USD
    applyShopSettingsToFx({});
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchShopSettings();
        if (!cancelled) setSettings(data || {});
      } catch {
        if (!cancelled) setSettings({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const fxSettings = applyShopSettingsToFx(settings);
    const regionMode = fxSettings.region_mode === 'nepal' ? 'nepal' : 'us';
    const currency = regionMode === 'nepal' ? 'NPR' : 'USD';
    const priceBaseCurrency = fxSettings.price_base_currency === 'USD' ? 'USD' : 'NPR';
    const usdNprRate = Number(fxSettings.usd_npr_rate) || 133;
    const timezone = String(
      settings.admin_timezone ||
        (regionMode === 'nepal' ? 'Asia/Kathmandu' : 'America/New_York'),
    );

    return {
      regionMode: regionMode as 'us' | 'nepal',
      currency,
      timezone,
      usdNprRate,
      priceBaseCurrency,
      settings: fxSettings as ShopSettings,
      formatMoney: (amount: number) => formatMoneyStatic(amount, currency),
      formatCatalogPrice: (baseAmount: number) =>
        formatMoneyStatic(toDisplayAmount(baseAmount, fxSettings), currency),
      toDisplay: (baseAmount: number) => toDisplayAmount(baseAmount, fxSettings),
      loading,
    };
  }, [settings, loading]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useShopLocale() {
  return useContext(LocaleContext);
}
