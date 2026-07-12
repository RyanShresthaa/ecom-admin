import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { DataTable } from '@/components/common/DataTable'
import { DeliveryStatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge'
import { useRecentOrders } from '@/hooks/useDashboard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('id', {
    header: 'Order',
    cell: (info) => <span className="font-mono text-xs font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('customerName', {
    header: 'Customer',
    cell: (info) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
          {getInitials(info.getValue())}
        </div>
        <span className="text-sm font-medium text-foreground">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Amount',
    cell: (info) => (
      <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('paymentStatus', {
    header: 'Payment',
    cell: (info) => <PaymentStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('deliveryStatus', {
    header: 'Delivery',
    cell: (info) => <DeliveryStatusBadge status={info.getValue()} />,
  }),
]

export function RecentOrdersTable() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })

  const params = useMemo(() => ({ page: pagination.pageIndex, pageSize: pagination.pageSize }), [pagination])
  const { data, isLoading, isFetching } = useRecentOrders(params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows}
      pageCount={data?.pageCount}
      rowCount={data?.rowCount}
      pagination={pagination}
      onPaginationChange={setPagination}
      isLoading={isLoading}
      isFetching={isFetching}
    />
  )
}
