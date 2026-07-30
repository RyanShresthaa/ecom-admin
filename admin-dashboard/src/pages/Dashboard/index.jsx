import { CurrencyDollar, ShoppingCartSimple, Users, ChartLineUp, ArrowsClockwise } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { SalesChart } from '@/pages/Dashboard/SalesChart'
import { RecentOrdersTable } from '@/pages/Dashboard/RecentOrdersTable'
import { useDashboardStats, useSalesSeries } from '@/hooks/useDashboard'
import { formatNumber, cn } from '@/lib/utils'
import { useLocale } from '@/context/LocaleContext'

export default function Dashboard() {
  const stats = useDashboardStats()
  const sales = useSalesSeries()
  const { formatCurrency, currency } = useLocale()

  const refreshAll = () => {
    stats.refetch()
    sales.refetch()
  }

  const isFetching = stats.isFetching || sales.isFetching

  // Order totals are stored in shop display currency (USD/NPR), not catalog NPR.
  const totalRevenueLabel = stats.data
    ? formatCurrency(stats.data.totalRevenue)
    : '—'

  const salesData = sales.data || []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Overview in ${currency === 'NPR' ? 'NPR' : 'USD'} · order amounts match checkout currency.`}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isFetching} className="gap-1.5">
            <ArrowsClockwise size={14} className={cn(isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={totalRevenueLabel}
          change={stats.data?.revenueChange}
          icon={CurrencyDollar}
          isLoading={stats.isLoading}
          accent="primary"
        />
        <KpiCard
          label="Total Orders"
          value={stats.data ? formatNumber(stats.data.totalOrders) : '—'}
          change={stats.data?.ordersChange}
          icon={ShoppingCartSimple}
          isLoading={stats.isLoading}
          accent="success"
        />
        <KpiCard
          label="Total Users"
          value={stats.data ? formatNumber(stats.data.totalUsers) : '—'}
          change={stats.data?.usersChange}
          icon={Users}
          isLoading={stats.isLoading}
          accent="warning"
        />
        <KpiCard
          label="Conversion Rate"
          value={stats.data ? `${stats.data.conversionRate}%` : '—'}
          change={stats.data?.conversionChange}
          icon={ChartLineUp}
          isLoading={stats.isLoading}
          accent="destructive"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Revenue & Orders</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4F46E5]" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C7D2FE]" /> Orders
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <SalesChart
            data={salesData}
            isLoading={sales.isLoading}
            isError={sales.isError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>The latest orders placed across your store</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentOrdersTable />
        </CardContent>
      </Card>
    </div>
  )
}
