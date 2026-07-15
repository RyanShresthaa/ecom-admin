'use client'

import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import { Eye } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PaymentStatusBadge } from '@/components/common/StatusBadge'
import { OrderStatusDropdown } from '@/features/Orders/OrderStatusDropdown'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

export function getOrderColumns({ onView, enableSelection = false, rowSelection, onRowSelectionChange }) {
  const columns = []

  if (enableSelection) {
    columns.push(
      columnHelper.display({
        id: 'select',
        header: () => {
          const pageIds = Object.keys(rowSelection || {})
          const allSelected = pageIds.length > 0
          return (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={allSelected}
              onChange={(e) => {
                if (!e.target.checked) {
                  onRowSelectionChange?.({})
                }
              }}
              aria-label="Select all on page"
            />
          )
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={Boolean(rowSelection?.[row.original.id])}
            onChange={(e) => {
              const next = { ...rowSelection }
              if (e.target.checked) {
                next[row.original.id] = true
              } else {
                delete next[row.original.id]
              }
              onRowSelectionChange?.(next)
            }}
            aria-label={`Select ${row.original.id}`}
          />
        ),
      })
    )
  }

  columns.push(
    columnHelper.accessor('id', {
      header: 'Order ID',
      cell: (info) => (
        <Link href={`/orders/${info.getValue()}`} className="font-mono text-xs font-medium text-primary hover:underline">
          {info.getValue()}
        </Link>
      ),
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
              <Link
                href={`/customers/${order.customerId}`}
                className="text-sm font-medium text-foreground hover:text-primary"
              >
                {order.customerName}
              </Link>
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
        <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
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
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={`/orders/${info.row.original.id}`} onClick={() => onView?.(info.row.original)}>
              <Eye size={14} />
              View
            </Link>
          </Button>
        </div>
      ),
    })
  )

  return columns
}
