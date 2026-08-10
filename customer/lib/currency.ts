/**
 * Shared NPR ↔ USD helpers for the storefront (mirrors backend/utils/currency.js).
 */

export const DEFAULT_USD_NPR_RATE = 133;

/** Live shop FX settings (updated by ShopLocaleProvider). */
let shopFx: {
  currency?: string;
  price_base_currency?: string;
  usd_npr_rate?: number;
  region_mode?: string;
} = {
  currency: 'USD',
  price_base_currency: 'NPR',
  usd_npr_rate: DEFAULT_USD_NPR_RATE,
  region_mode: 'us',
};

export function setShopFxSettings(next: Partial<typeof shopFx>) {
  shopFx = { ...shopFx, ...next };
}

export function getShopFxSettings() {
  return { ...shopFx };
}

/** Normalize API shop settings into FX fields used for NPR ↔ USD conversion. */
export function applyShopSettingsToFx(settings: {
  currency?: string;
  price_base_currency?: string;
  usd_npr_rate?: number;
  region_mode?: string;
  [key: string]: unknown;
} = {}) {
  const regionMode =
    String(settings.region_mode || 'us').toLowerCase() === 'nepal' ? 'nepal' : 'us';
  const currency = regionMode === 'nepal' ? 'NPR' : 'USD';
  const price_base_currency = 'NPR';
  const usd_npr_rate = normalizeUsdNprRate(settings.usd_npr_rate);
  const fx = {
    ...settings,
    currency,
    region_mode: regionMode,
    price_base_currency,
    usd_npr_rate,
  };
  setShopFxSettings(fx);
  return fx;
}

export function normalizeUsdNprRate(rate: unknown): number {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_USD_NPR_RATE;
  return n;
}

/** Match backend/utils/pricing.js — catalog unit after product % discount. */
export function unitPriceAfterDiscount(price: number, discountPercent = 0): number {
  const p = Number(price) || 0;
  const d = Number(discountPercent) || 0;
  const off = Math.ceil((p * d) / 100);
  return Math.max(0, p - off);
}

export function normalizeCurrencyCode(code: unknown, fallback = 'USD'): string {
  const c = String(code || fallback).trim().toUpperCase();
  if (c === 'NPR' || c === 'NRS' || c === 'RS') return 'NPR';
  if (c === 'USD' || c === 'US$') return 'USD';
  return c || fallback;
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  usdNprRate: number = DEFAULT_USD_NPR_RATE,
): number {
  const value = Number(amount) || 0;
  const src = normalizeCurrencyCode(from);
  const dest = normalizeCurrencyCode(to);
  if (src === dest) return Number(value.toFixed(2));

  const rate = normalizeUsdNprRate(usdNprRate);
  let inUsd = value;
  if (src === 'NPR') inUsd = value / rate;
  else if (src !== 'USD') return Number(value.toFixed(2));

  let out = inUsd;
  if (dest === 'NPR') out = inUsd * rate;
  else if (dest !== 'USD') return Number(value.toFixed(2));

  return Number(out.toFixed(2));
}

export function toDisplayAmount(
  baseAmount: number,
  settings: {
    currency?: string;
    price_base_currency?: string;
    usd_npr_rate?: number;
    region_mode?: string;
    regionMode?: string;
  } = {},
): number {
  const regionMode = String(settings.region_mode || settings.regionMode || 'us').toLowerCase();
  const rate = normalizeUsdNprRate(settings.usd_npr_rate);
  const value = Number(baseAmount) || 0;
  // Catalog prices are always NPR; US region converts to USD.
  if (regionMode === 'nepal') return Number(value.toFixed(2));
  return Number((value / rate).toFixed(2));
}

/** Display amount → catalog NPR for cart/local math helpers. */
export function toBaseAmount(
  displayAmount: number,
  settings: {
    usd_npr_rate?: number;
    region_mode?: string;
    regionMode?: string;
  } = {},
): number {
  const regionMode = String(settings.region_mode || settings.regionMode || 'us').toLowerCase();
  const rate = normalizeUsdNprRate(settings.usd_npr_rate);
  const value = Number(displayAmount) || 0;
  if (regionMode === 'nepal') return Number(value.toFixed(2));
  return Number((value * rate).toFixed(2));
}
