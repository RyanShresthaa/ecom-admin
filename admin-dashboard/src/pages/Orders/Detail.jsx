import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, EnvelopeSimple, MapPin, Receipt } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/common/PageLoader'
import { PaymentStatusBadge } from '@/components/common/StatusBadge'
import { OrderStatusDropdown } from '@/pages/Orders/OrderStatusDropdown'
import { PaymentStatusDropdown } from '@/pages/Orders/PaymentStatusDropdown'
import { OrderTimeline } from '@/pages/Orders/OrderTimeline'
import { OrderNotes } from '@/pages/Orders/OrderNotes'
import { OrderInvoice } from '@/pages/Orders/OrderInvoice'
import { useOrderQuery } from '@/hooks/useOrders'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'

export default function OrderDetail() {
  const { id } = useParams()
  const { data: order, isLoading } = useOrderQuery(id)
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.ORDERS_WRITE)

  if (isLoading) return <PageLoader />

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="outline" asChild>
          <Link to="/orders">Back to orders</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={order.id}
        description={`Placed on ${formatDate(order.date)}`}
        actions={
          <div className="flex items-center gap-2">
            <OrderInvoice order={order} />
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/orders">
                <ArrowLeft size={14} />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-1">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(order.customerName)}
                </div>
                <div>
                  <Link
                    to={`/customers/${order.customerId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {order.customerName}
                  </Link>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <EnvelopeSimple size={12} /> {order.customerEmail}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-0">
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1.5 text-xs text-muted-foreground">Payment</p>
                {canWrite ? (
                  <PaymentStatusDropdown order={order} />
                ) : (
                  <PaymentStatusBadge status={order.paymentStatus} />
                )}
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1.5 text-xs text-muted-foreground">Delivery</p>
                {canWrite ? (
                  <OrderStatusDropdown order={order} />
                ) : (
                  <span className="text-sm">{order.deliveryStatus}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin size={16} />
                Shipping address
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <span className="text-sm font-semibold">Order total</span>
              <span className="font-mono text-xl font-semibold tabular-nums">{formatCurrency(order.totalAmount)}</span>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Receipt size={16} />
                Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.sku && `${item.sku} · `}
                        {item.color && item.size && `${item.color}/${item.size} · `}
                        Qty {item.qty} × {formatCurrency(item.price)}
                      </span>
                    </div>
                    <span className="font-mono font-medium tabular-nums">{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="notes">Internal notes ({order.internalNotes?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="mt-4">
                  <OrderTimeline history={order.statusHistory} />
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <OrderNotes order={order} canWrite={canWrite} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
