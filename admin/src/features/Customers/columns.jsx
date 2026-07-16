import { Link } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { Eye } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { formatCurrency, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

export function getCustomerColumns({ onView }) {
  return [
    columnHelper.accessor('name', {
      header: 'Customer',
      enableSorting: true,
      cell: (info) => {
        const customer = info.row.original
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {getInitials(customer.name)}
            </div>
            <div className="flex min-w-0 flex-col">
              <Link
                to={`/customers/${customer.id}`}
                className="truncate text-sm font-medium text-foreground hover:text-primary"
              >
                {customer.name}
              </Link>
              <span className="truncate text-[11px] text-muted-foreground">{customer.email}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('orderCount', {
      header: 'Orders',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm tabular-nums">{info.getValue() ?? 0}</span>
      ),
    }),
    columnHelper.accessor('lifetimeValue', {
      header: 'Lifetime value',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">
          {formatCurrency(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link
              to={`/customers/${info.row.original.id}`}
              onClick={() => onView?.(info.row.original)}
            >
              <Eye size={14} />
              View
            </Link>
          </Button>
        </div>
      ),
    }),
  ]
}
