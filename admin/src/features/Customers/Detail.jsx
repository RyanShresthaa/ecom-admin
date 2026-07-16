import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  EnvelopeSimple,
  Phone,
  MapPin,
  ShoppingBag,
  CurrencyDollar,
  CalendarBlank,
} from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/common/PageLoader'
import { DataTable } from '@/components/common/DataTable'
import { PaymentStatusBadge } from '@/components/common/StatusBadge'
import { useCustomerQuery, useCustomerOrdersQuery } from '@/hooks/useCustomers'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { createColumnHelper } from '@tanstack/react-table'

const orderColumnHelper = createColumnHelper()

function getOrderHistoryColumns() {
  return [
    orderColumnHelper.accessor('id', {
      header: 'Order',
      cell: (info) => (
        <Link to={`/orders/${info.getValue()}`} className="font-mono text-xs font-medium text-primary hover:underline">
          {info.getValue()}
        </Link>
      ),
    }),
    orderColumnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    orderColumnHelper.accessor('items', {
      header: 'Items',
      cell: (info) => <span className="text-sm">{(info.getValue() || []).length}</span>,
    }),
    orderColumnHelper.accessor('totalAmount', {
      header: 'Total',
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
      ),
    }),
    orderColumnHelper.accessor('paymentStatus', {
      header: 'Payment',
      cell: (info) => <PaymentStatusBadge status={info.getValue()} />,
    }),
    orderColumnHelper.accessor('deliveryStatus', {
      header: 'Delivery',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
  ]
}

export default function CustomerDetail() {
  const { id } = useParams()
  const { data: customer, isLoading } = useCustomerQuery(id)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })

  const orderParams = useMemo(
    () => ({ page: pagination.pageIndex, pageSize: pagination.pageSize }),
    [pagination]
  )

  const { data: ordersData, isLoading: ordersLoading } = useCustomerOrdersQuery(id, orderParams)
  const orderColumns = useMemo(() => getOrderHistoryColumns(), [])

  if (isLoading) return <PageLoader />

  if (!customer) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" asChild>
          <Link to="/customers">Back to customers</Link>
        </Button>
      </div>
    )
  }

  const addresses = Array.isArray(customer.addresses) ? customer.addresses : []
  const tags = Array.isArray(customer.tags) ? customer.tags : []
  const orderCount = Number(customer.orderCount || 0)
  const lifetimeValue = Number(customer.lifetimeValue || 0)
  const avgOrderValue =
    customer.avgOrderValue != null
      ? Number(customer.avgOrderValue)
      : orderCount > 0
        ? lifetimeValue / orderCount
        : 0

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={customer.name}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/customers">
              <ArrowLeft size={14} />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {getInitials(customer.name)}
              </div>
              <div>
                <p className="font-mono text-xs text-muted-foreground">{customer.id}</p>
                <h2 className="text-lg font-semibold">{customer.name}</h2>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <div className="flex items-center gap-2.5 text-sm">
                <EnvelopeSimple size={16} className="shrink-0 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                  {customer.email}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Phone size={16} className="shrink-0 text-muted-foreground" />
                <span>{customer.phone || '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lifetime value</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-0">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CurrencyDollar size={13} /> Total spent
                </div>
                <p className="font-mono text-lg font-semibold tabular-nums">{formatCurrency(lifetimeValue)}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShoppingBag size={13} /> Orders
                </div>
                <p className="font-mono text-lg font-semibold tabular-nums">{orderCount}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarBlank size={13} /> Avg. order value
                </div>
                <p className="font-mono text-lg font-semibold tabular-nums">{formatCurrency(avgOrderValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin size={16} />
                Addresses ({addresses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {addresses.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No saved addresses.</p>
              )}
              {addresses.map((addr) => (
                <div key={addr.id} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium">{addr.label || 'Address'}</span>
                    {addr.isDefault && (
                      <Badge variant="outline" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{addr.line1}</p>
                  {addr.line2 && <p className="text-sm text-muted-foreground">{addr.line2}</p>}
                  <p className="text-sm text-muted-foreground">
                    {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground">{addr.country}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order history</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DataTable
                columns={orderColumns}
                data={ordersData?.rows || []}
                pageCount={ordersData?.pageCount}
                rowCount={ordersData?.rowCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                isLoading={ordersLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
