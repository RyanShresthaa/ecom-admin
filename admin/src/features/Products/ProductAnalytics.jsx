import { Link } from 'react-router-dom'
import { ChartBar, Package, ShoppingCartSimple, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/common/KpiCard'
import { PaymentStatusBadge, DeliveryStatusBadge } from '@/components/common/StatusBadge'
import { useProductAnalyticsQuery } from '@/hooks/useProducts'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

function EmptyState({ message }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
}

export function ProductAnalytics({ productId }) {
  const { data, isLoading } = useProductAnalyticsQuery(productId)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCard key={index} label="Loading" value="—" isLoading />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { stats, buyers, orderHistory, refunds, complaints } = data

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Units sold" value={stats.sold} icon={ShoppingCartSimple} accent="success" />
        <KpiCard label="Units refunded" value={stats.refunded} icon={ArrowCounterClockwise} accent="warning" />
        <KpiCard label="Complaints" value={stats.complaints} icon={WarningCircle} accent="destructive" />
        <KpiCard label="Revenue" value={formatCurrency(stats.revenue)} icon={ChartBar} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Sales activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="buyers">
            <TabsList>
              <TabsTrigger value="buyers">Buyers ({buyers.length})</TabsTrigger>
              <TabsTrigger value="orders">All orders ({orderHistory.length})</TabsTrigger>
              <TabsTrigger value="refunds">Refunds ({refunds.length})</TabsTrigger>
              <TabsTrigger value="complaints">Complaints ({complaints.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="buyers" className="mt-4">
              {buyers.length === 0 ? (
                <EmptyState message="No customers have purchased this product yet." />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5">Customer</th>
                        <th className="px-3 py-2.5">Sold</th>
                        <th className="px-3 py-2.5">Refunded</th>
                        <th className="px-3 py-2.5">Orders</th>
                        <th className="px-3 py-2.5">Last purchase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((buyer) => (
                        <tr key={buyer.customerId} className="border-b border-border last:border-0">
                          <td className="px-3 py-3">
                            <Link to={`/customers/${buyer.customerId}`} className="font-medium text-foreground hover:text-primary">
                              {buyer.customerName}
                            </Link>
                            <p className="text-xs text-muted-foreground">{buyer.customerEmail}</p>
                          </td>
                          <td className="px-3 py-3 font-mono tabular-nums">{buyer.soldQty ?? 0}</td>
                          <td className="px-3 py-3 font-mono tabular-nums text-muted-foreground">{buyer.refundedQty ?? 0}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{buyer.orderCount}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDate(buyer.lastOrderDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              {orderHistory.length === 0 ? (
                <EmptyState message="No orders include this product." />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5">Order</th>
                        <th className="px-3 py-2.5">Customer</th>
                        <th className="px-3 py-2.5">Qty</th>
                        <th className="px-3 py-2.5">Total</th>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderHistory.map((entry) => (
                        <tr key={`${entry.orderId}-${entry.date}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-3">
                            <Link to={`/orders/${entry.orderId}`} className="font-mono text-xs font-medium hover:text-primary">
                              {entry.orderId}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <Link to={`/customers/${entry.customerId}`} className="hover:text-primary">
                              {entry.customerName}
                            </Link>
                          </td>
                          <td className="px-3 py-3 font-mono tabular-nums">{entry.qty}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{formatCurrency(entry.total)}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDate(entry.date)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <PaymentStatusBadge status={entry.paymentStatus} />
                              <DeliveryStatusBadge status={entry.deliveryStatus} />
                              {entry.sold && <Badge variant="success">Sold</Badge>}
                              {entry.refunded && <Badge variant="destructive">Refunded</Badge>}
                              {entry.pending && <Badge variant="secondary">Pending</Badge>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="refunds" className="mt-4">
              {refunds.length === 0 ? (
                <EmptyState message="No refunds recorded for this product." />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5">Order</th>
                        <th className="px-3 py-2.5">Customer</th>
                        <th className="px-3 py-2.5">Qty refunded</th>
                        <th className="px-3 py-2.5">Amount</th>
                        <th className="px-3 py-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((entry) => (
                        <tr key={`refund-${entry.orderId}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-3">
                            <Link to={`/orders/${entry.orderId}`} className="font-mono text-xs font-medium hover:text-primary">
                              {entry.orderId}
                            </Link>
                          </td>
                          <td className="px-3 py-3">{entry.customerName}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{entry.qty}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{formatCurrency(entry.total)}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDate(entry.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="complaints" className="mt-4">
              {complaints.length === 0 ? (
                <EmptyState message="No complaints logged for this product." />
              ) : (
                <div className="flex flex-col gap-3">
                  {complaints.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Link to={`/customers/${entry.customerId}`} className="text-sm font-medium hover:text-primary">
                            {entry.customerName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{entry.customerEmail}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <Link to={`/orders/${entry.orderId}`} className="font-mono hover:text-primary">
                            {entry.orderId}
                          </Link>
                          <p>{formatDateTime(entry.date)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-foreground">{entry.text}</p>
                      {entry.author && (
                        <p className="mt-2 text-xs text-muted-foreground">Logged by {entry.author}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        <Package size={16} />
        <span>
          {stats.buyers} unique buyer{stats.buyers === 1 ? '' : 's'} · {stats.sold} sold · {stats.refunded} refunded ·{' '}
          {stats.complaints} complaint{stats.complaints === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
