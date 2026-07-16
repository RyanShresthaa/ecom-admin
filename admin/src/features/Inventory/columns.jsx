import { createColumnHelper } from '@tanstack/react-table'
import { Warning, /* MapPin, */ Stack, ArrowsDownUp } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const columnHelper = createColumnHelper()

// Inventory stock tab — column definitions for the inventory DataTable.
export function getInventoryColumns({ onAdjust, canWrite = false }) {
  const columns = [
    columnHelper.accessor('productName', {
      header: 'Product',
      cell: (info) => {
        const row = info.row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Stack size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{row.productName}</span>
              <span className="text-[11px] text-muted-foreground">{row.category}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('sku', {
      header: 'SKU',
      cell: (info) => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('stockQuantity', {
      header: 'Stock Qty',
      cell: (info) => {
        const row = info.row.original
        return (
          <span
            className={
              'font-mono text-sm font-medium tabular-nums ' +
              (row.lowStock ? 'text-destructive' : 'text-foreground')
            }
          >
            {info.getValue()}
          </span>
        )
      },
    }),
    columnHelper.accessor('threshold', {
      header: 'Threshold',
      cell: (info) => <span className="font-mono text-sm tabular-nums text-muted-foreground">{info.getValue()}</span>,
    }),
    // When need to add different store
    // columnHelper.accessor('warehouse', {
    //   header: 'Warehouse',
    //   cell: (info) => (
    //     <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
    //       <MapPin size={13} />
    //       {info.getValue()}
    //     </span>
    //   ),
    // }),
    columnHelper.display({
      id: 'lowStock',
      header: 'Status',
      cell: (info) => {
        const row = info.row.original
        return row.lowStock ? (
          <Badge variant="destructive">
            <Warning size={11} weight="bold" />
            Low stock
          </Badge>
        ) : (
          <Badge variant="success">In stock</Badge>
        )
      },
    }),
  ]

  // Append adjust-stock action column when user has inventory write access.
  if (canWrite) {
    columns.push(
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onAdjust(info.row.original)}
            >
              <ArrowsDownUp size={14} />
              Adjust
            </Button>
          </div>
        ),
      })
    )
  }

  return columns
}
