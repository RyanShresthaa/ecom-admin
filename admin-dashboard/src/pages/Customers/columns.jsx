import { createColumnHelper } from '@tanstack/react-table'
import { Eye } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

export function getCustomerColumns({ onView }) {
  return [
    columnHelper.accessor('name', {
      header: 'Customer',
      enableSorting: true,
      cell: (info) => {
        const customer = info.row.original
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {getInitials(customer.name)}
            </div>
            <div className="flex flex-col">
              <Link to={`/customers/${customer.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                {customer.name}
              </Link>
              <span className="text-[11px] text-muted-foreground">{customer.email}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('orderCount', {
      header: 'Orders',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('lifetimeValue', {
      header: 'Lifetime value',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('refundedQty', {
      header: 'Refunded units',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">{info.getValue() ?? 0}</span>
      ),
    }),
    columnHelper.accessor('complaintCount', {
      header: 'Complaints',
      enableSorting: true,
      cell: (info) => {
        const count = info.getValue() ?? 0
        return (
          <span className={count > 0 ? 'font-mono text-sm font-medium tabular-nums text-destructive' : 'font-mono text-sm tabular-nums text-muted-foreground'}>
            {count}
          </span>
        )
      },
    }),
    columnHelper.accessor('lastOrderDate', {
      header: 'Last order',
      enableSorting: true,
      cell: (info) => {
        const val = info.getValue()
        return (
          <span className="text-sm text-muted-foreground">{val ? formatDate(val) : '—'}</span>
        )
      },
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() || []
        if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link to={`/customers/${info.row.original.id}`} onClick={() => onView?.(info.row.original)}>
              <Eye size={14} />
              View
            </Link>
          </Button>
        </div>
      ),
    }),
  ]
}
