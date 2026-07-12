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
import { formatCurrency } from '@/lib/utils'

const REVENUE_COLOR = '#4F46E5'
const ORDERS_COLOR = '#C7D2FE'
const GRID_COLOR = '#E5E7EB'
const AXIS_COLOR = '#94A3B8'

function CustomTooltip({ active, payload, label }) {
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

export function SalesChart({ data, isLoading }) {
  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
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
          tickFormatter={(v) => `$${v / 1000}k`}
          width={48}
        />
        <YAxis yAxisId="orders" orientation="right" hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,70,229,0.04)' }} />
        <Bar
          yAxisId="orders"
          dataKey="orders"
          fill={ORDERS_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke={REVENUE_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
