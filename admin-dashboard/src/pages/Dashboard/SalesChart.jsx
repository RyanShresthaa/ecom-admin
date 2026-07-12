import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const REVENUE_COLOR = '#4F46E5'
const ORDERS_COLOR = '#C7D2FE'
const SELECTED_BAR_COLOR = '#818CF8'
const GRID_COLOR = '#E5E7EB'
const AXIS_COLOR = '#94A3B8'

function formatAxisDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function DayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload
  if (!point) return null

  const rows = [
    { label: 'Revenue', value: formatCurrency(point.revenue), color: REVENUE_COLOR },
    { label: 'Orders', value: formatNumber(point.orders), color: ORDERS_COLOR },
    { label: 'Items sold', value: formatNumber(point.itemsSold ?? 0), color: '#10B981' },
    { label: 'Avg. order', value: formatCurrency(point.avgOrderValue ?? 0), color: '#F59E0B' },
  ]

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-2 font-medium text-foreground">{formatDate(point.date)}</p>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SelectedDaySummary({ point, onClear }) {
  if (!point) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected day</p>
        <p className="text-sm font-semibold text-foreground">{formatDate(point.date)}</p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="font-mono font-medium tabular-nums">{formatCurrency(point.revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="font-mono font-medium tabular-nums">{formatNumber(point.orders)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Items sold</p>
          <p className="font-mono font-medium tabular-nums">{formatNumber(point.itemsSold ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg. order</p>
          <p className="font-mono font-medium tabular-nums">{formatCurrency(point.avgOrderValue ?? 0)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-primary hover:underline"
      >
        Clear
      </button>
    </div>
  )
}

export function SalesChart({ data, isLoading, selectedDate, onSelectedDateChange }) {
  const selectedPoint = useMemo(
    () => data?.find((entry) => entry.date === selectedDate) ?? null,
    [data, selectedDate]
  )

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />
  }

  const selectPoint = (point) => {
    if (point?.date) onSelectedDateChange?.(point.date)
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
          onClick={(state) => {
            const index = state?.activeTooltipIndex
            if (index != null && data?.[index]) selectPoint(data[index])
          }}
        >
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval="preserveStartEnd"
            tickFormatter={formatAxisDate}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v / 1000}k`}
            width={48}
          />
          <YAxis yAxisId="orders" orientation="right" hide />
          <Tooltip
            content={<DayTooltip />}
            cursor={{ fill: 'rgba(79,70,229,0.06)' }}
            shared
            trigger="axis"
          />
          <Bar
            yAxisId="orders"
            dataKey="orders"
            fill={ORDERS_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            className="cursor-pointer"
            onClick={selectPoint}
          >
            {data?.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.date === selectedDate ? SELECTED_BAR_COLOR : ORDERS_COLOR}
              />
            ))}
          </Bar>
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke={REVENUE_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: '#fff',
              fill: REVENUE_COLOR,
              onClick: selectPoint,
              cursor: 'pointer',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <SelectedDaySummary point={selectedPoint} onClear={() => onSelectedDateChange?.(null)} />

      {!selectedPoint && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Hover a day for details · Click a day to filter orders below
        </p>
      )}
    </div>
  )
}
