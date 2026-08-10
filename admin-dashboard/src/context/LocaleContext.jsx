import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

import { useAuth } from '@/context/AuthContext'
import { useSettingsQuery } from '@/hooks/useSettings'
import {
  formatCurrency as formatCurrencyBase,
  formatDate as formatDateBase,
  setLocaleConfig,
} from '@/lib/utils'
import { toBaseAmount, toDisplayAmount } from '@/lib/currency'

const DEFAULT_FX = {
  regionMode: 'us',
  currency: 'USD',
  priceBaseCurrency: 'NPR',
  usdNprRate: 133,
  timezone: 'America/New_York',
  region: 'United States',
}

function buildLocaleValue(data) {
  const regionMode =
    String(data?.regionMode || data?.region_mode || 'us').toLowerCase() === 'nepal'
      ? 'nepal'
      : 'us'
  const currency = regionMode === 'nepal' ? 'NPR' : 'USD'
  // Product catalog is always NPR; region only changes display currency.
  const priceBaseCurrency = 'NPR'
  const usdNprRate =
    Number(data?.usdNprRate ?? data?.usd_npr_rate) > 0
      ? Number(data?.usdNprRate ?? data?.usd_npr_rate)
      : 133
  const timezone =
    data?.timezone ||
    data?.admin_timezone ||
    (regionMode === 'nepal' ? 'Asia/Kathmandu' : 'America/New_York')
  const region =
    data?.region ||
    data?.tax_region ||
    (regionMode === 'nepal' ? 'Nepal' : 'United States')
  const fx = { currency, priceBaseCurrency, usdNprRate, regionMode }

  return {
    regionMode,
    currency,
    priceBaseCurrency,
    usdNprRate,
    timezone,
    region,
    loading: false,
    /** Format an amount already in the shop display currency (orders, totals). */
    formatCurrency: (v, code = currency) => formatCurrencyBase(v, code),
    /** Convert catalog NPR price → display currency, then format. */
    formatCatalogPrice: (baseValue) =>
      formatCurrencyBase(toDisplayAmount(baseValue, fx), currency),
    toDisplay: (baseValue) => toDisplayAmount(baseValue, fx),
    toBase: (displayValue) => toBaseAmount(displayValue, fx),
    formatDate: (d) => formatDateBase(d, timezone),
  }
}

const LocaleContext = createContext({
  ...DEFAULT_FX,
  loading: true,
  formatCurrency: (value) => formatCurrencyBase(value, 'USD'),
  formatCatalogPrice: (baseValue) =>
    formatCurrencyBase(
      toDisplayAmount(baseValue, {
        currency: 'USD',
        priceBaseCurrency: 'NPR',
        usdNprRate: 133,
        regionMode: 'us',
      }),
      'USD',
    ),
  toDisplay: (baseValue) =>
    toDisplayAmount(baseValue, {
      currency: 'USD',
      priceBaseCurrency: 'NPR',
      usdNprRate: 133,
      regionMode: 'us',
    }),
  toBase: (displayValue) =>
    toBaseAmount(displayValue, {
      currency: 'USD',
      priceBaseCurrency: 'NPR',
      usdNprRate: 133,
      regionMode: 'us',
    }),
  formatDate: (date) => formatDateBase(date, 'America/New_York'),
})

export function LocaleProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data, isLoading: settingsLoading, isFetching } = useSettingsQuery({
    enabled: isAuthenticated && !authLoading,
  })
  const lastSettingsRef = useRef(null)
  if (data) lastSettingsRef.current = data

  const value = useMemo(() => {
    // Keep last known settings during refetch so prices don't flash back to US defaults
    const source = data || lastSettingsRef.current
    const locale = buildLocaleValue(source || undefined)
    return {
      ...locale,
      loading:
        authLoading ||
        (isAuthenticated && settingsLoading && !source) ||
        (isAuthenticated && isFetching && !source),
    }
  }, [data, authLoading, isAuthenticated, settingsLoading, isFetching])

  useEffect(() => {
    setLocaleConfig(value)
  }, [value])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}
