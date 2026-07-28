import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/context/LocaleContext'

const REVENUE_COLOR = '#4F46E5'
const ORDERS_COLOR = '#C7D2FE'
const GRID_COLOR = '#E5E7EB'
const AXIS_COLOR = '#94A3B8'

function formatAxisRevenue(value, currency) {
  const n = Number(value) || 0
  const symbol = currency === 'NPR' ? 'रु' : '$'
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `${symbol}${Math.round(n)}`
}

function CustomTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.dataKey === 'revenue' ? 'Revenue' : 'Orders'}
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SalesChart({ data, isLoading, isError }) {
  const { formatCurrency, currency } = useLocale()
  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />
  }

  if (isError) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Could not load chart data. Try Refresh.
      </div>
    )
  }

  const series = Array.isArray(data) ? data : []
  const hasActivity = series.some((d) => (d.revenue || 0) > 0 || (d.orders || 0) > 0)

  return (
    <div className="relative h-[280px] w-full min-w-0">
      {!hasActivity && (
        <p className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-xs text-muted-foreground">
          No order activity in the last 14 days yet — new orders will appear here.
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={series} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatAxisRevenue(v, currency)}
            width={52}
            allowDecimals={false}
          />
          <YAxis yAxisId="orders" orientation="right" hide allowDecimals={false} />
          <Tooltip
            content={<CustomTooltip formatCurrency={formatCurrency} />}
            cursor={{ fill: 'rgba(79,70,229,0.04)' }}
          />
          <Bar
            yAxisId="orders"
            dataKey="orders"
            fill={ORDERS_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke={REVENUE_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
