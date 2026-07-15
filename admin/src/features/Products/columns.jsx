'use client'

import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import { DotsThree, PencilSimple, Trash, Package, Eye } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ProductStatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency } from '@/lib/utils'

const columnHelper = createColumnHelper()

export function getProductColumns({ onEdit, onDelete, canWrite = true }) {
  const columns = [
    columnHelper.accessor('name', {
      header: 'Product',
      enableSorting: true,
      cell: (info) => {
        const product = info.row.original
        return (
          <div className="flex items-center gap-3">
            {product.image ? (
              <img src={product.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Package size={16} />
              </div>
            )}
            <div className="flex flex-col">
              <Link href={`/products/${product.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                {product.name}
              </Link>
              <span className="font-mono text-[11px] text-muted-foreground">{product.sku}</span>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('stock', {
      header: 'Stock',
      enableSorting: true,
      cell: (info) => {
        const stock = info.getValue() ?? 0
        return (
          <span
            className={
              'font-mono text-sm tabular-nums ' + (stock === 0 ? 'font-medium text-destructive' : 'text-foreground')
            }
          >
            {stock}
          </span>
        )
      },
    }),
    columnHelper.accessor('soldQty', {
      header: 'Sold',
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-sm tabular-nums text-foreground">{info.getValue() ?? 0}</span>
      ),
    }),
    columnHelper.accessor('refundedQty', {
      header: 'Refunded',
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
          <span
            className={
              count > 0
                ? 'font-mono text-sm font-medium tabular-nums text-destructive'
                : 'font-mono text-sm tabular-nums text-muted-foreground'
            }
          >
            {count}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'variants',
      header: 'Variants',
      cell: (info) => {
        const count = info.row.original.variants?.length || 0
        return (
          <span className="text-sm text-muted-foreground">{count > 0 ? count : '—'}</span>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <ProductStatusBadge status={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const product = info.row.original
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/products/${product.id}`}>
                <Eye size={16} />
              </Link>
            </Button>
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <DotsThree size={18} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(product)}>
                    <PencilSimple size={14} /> Edit product
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(product)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash size={14} /> Delete product
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      },
    }),
  ]

  return columns
}
