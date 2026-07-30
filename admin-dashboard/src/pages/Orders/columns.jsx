import { createColumnHelper } from '@tanstack/react-table'
import { Eye } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PaymentStatusBadge } from '@/components/common/StatusBadge'
import { OrderStatusDropdown } from '@/pages/Orders/OrderStatusDropdown'
import { formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

export function getOrderColumns({ onView, formatCurrency }) {
  const formatPrice = formatCurrency || ((v) => String(v))
  return [
    columnHelper.accessor('id', {
      header: 'Order ID',
      cell: (info) => <span className="font-mono text-xs font-medium text-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('customerName', {
      header: 'Customer',
      cell: (info) => {
        const order = info.row.original
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
              {getInitials(order.customerName)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{order.customerName}</span>
              <span className="text-[11px] text-muted-foreground">{order.customerEmail}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('totalAmount', {
      header: 'Total',
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">{formatPrice(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('paymentStatus', {
      header: 'Payment',
      cell: (info) => <PaymentStatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('deliveryStatus', {
      header: 'Delivery',
      cell: (info) => <OrderStatusDropdown order={info.row.original} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onView(info.row.original)}>
            <Eye size={14} />
            View
          </Button>
        </div>
      ),
    }),
  ]
}
