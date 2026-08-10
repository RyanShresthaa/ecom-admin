import { createColumnHelper } from '@tanstack/react-table'
import { DotsThree, PencilSimple, Trash, Package } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ProductStatusBadge } from '@/components/common/StatusBadge'

const columnHelper = createColumnHelper()

export function getProductColumns({ onEdit, onDelete, currency = 'USD', formatPrice }) {
  const priceFmt =
    typeof formatPrice === 'function'
      ? formatPrice
      : (v) => `${currency} ${Number(v) || 0}`

  return [
    columnHelper.accessor('name', {
      header: 'Product',
      cell: (info) => {
        const product = info.row.original
        const thumb = product.image || product.images?.[0]
        const extra = Math.max(0, (product.images?.length || 0) - 1)
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-secondary text-muted-foreground">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package size={16} />
                </div>
              )}
              {extra > 0 ? (
                <span className="absolute bottom-0 right-0 rounded-tl bg-black/65 px-1 text-[9px] font-medium text-white">
                  +{extra}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{product.name}</span>
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
      header: `Price (${currency})`,
      cell: (info) => (
        <span className="font-mono text-sm font-medium tabular-nums">
          {priceFmt(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('stock', {
      header: 'Stock',
      cell: (info) => {
        const stock = info.getValue()
        return (
          <span
            className={
              'font-mono text-sm tabular-nums ' +
              (stock === 0 ? 'font-medium text-destructive' : 'text-foreground')
            }
          >
            {stock}
          </span>
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
          <div className="flex justify-end">
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
          </div>
        )
      },
    }),
  ]
}
