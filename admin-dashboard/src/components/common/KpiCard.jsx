import { TrendDown, TrendUp } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function KpiCard({ label, value, change, icon: Icon, isLoading, accent = 'primary' }) {
  const isPositive = change >= 0

  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/15 text-warning-foreground',
    destructive: 'bg-destructive/10 text-destructive',
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
            {typeof change === 'number' && (
              <div
                className={cn(
                  'inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
                  isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                )}
              >
                {isPositive ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                {Math.abs(change)}%
                <span className="font-normal text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accentMap[accent])}>
              <Icon size={18} weight="bold" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
