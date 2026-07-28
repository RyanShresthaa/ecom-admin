import { createColumnHelper } from '@tanstack/react-table'
import { Warning, MapPin, Stack, DotsThree, Plus, Minus, ArrowsLeftRight } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const columnHelper = createColumnHelper()

export function getInventoryColumns({ onAdd, onRemove, onTransfer }) {
  return [
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
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
      ),
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
    columnHelper.accessor('warehouse', {
      header: 'Warehouse',
      cell: (info) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={13} />
          {info.getValue()}
        </span>
      ),
    }),
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
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <DotsThree size={18} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAdd(row)}>
                  <Plus size={14} /> Add stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRemove(row)}>
                  <Minus size={14} /> Remove stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTransfer(row)}>
                  <ArrowsLeftRight size={14} /> Transfer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    }),
  ]
}
