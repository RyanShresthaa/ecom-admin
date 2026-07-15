import { useMemo, useState } from 'react'
import { ShoppingCart, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/common/DataTable'
import { useReorderSuggestionsQuery } from '@/hooks/useInventory'
import { createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper()

const URGENCY_VARIANTS = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
}

export function ReorderSuggestionsTab({ onCreatePO }) {
  const [urgency, setUrgency] = useState('all')
  const [selected, setSelected] = useState({})

  const params = useMemo(() => ({ urgency }), [urgency])
  const { data, isLoading } = useReorderSuggestionsQuery(params)

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={Boolean(selected[row.original.inventoryId])}
            onChange={(e) => {
              const next = { ...selected }
              if (e.target.checked) next[row.original.inventoryId] = row.original
              else delete next[row.original.inventoryId]
              setSelected(next)
            }}
          />
        ),
      }),
      columnHelper.accessor('productName', {
        header: 'Product',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.productName}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{row.sku}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('currentStock', {
        header: 'Current stock',
        cell: (info) => (
          <span className="font-mono text-sm font-medium tabular-nums text-destructive">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('threshold', {
        header: 'Threshold',
        cell: (info) => <span className="font-mono text-sm tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.accessor('suggestedQty', {
        header: 'Suggested order',
        cell: (info) => (
          <span className="font-mono text-sm font-medium tabular-nums text-primary">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('urgency', {
        header: 'Urgency',
        cell: (info) => (
          <Badge variant={URGENCY_VARIANTS[info.getValue()] || 'secondary'}>
            {info.getValue() === 'critical' && <Warning size={11} weight="bold" />}
            {info.getValue()}
          </Badge>
        ),
      }),
      // When need to add different store
      // columnHelper.accessor('warehouse', {
      //   header: 'Warehouse',
      //   cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
      // }),
    ],
    [selected]
  )

  const selectedItems = Object.values(selected)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All urgency</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
          </SelectContent>
        </Select>

        {selectedItems.length > 0 && (
          <Button size="sm" className="gap-1.5" onClick={() => onCreatePO(selectedItems)}>
            <ShoppingCart size={14} />
            Create PO ({selectedItems.length})
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.rows}
        pageCount={1}
        rowCount={data?.rowCount}
        pagination={{ pageIndex: 0, pageSize: data?.rowCount || 10 }}
        onPaginationChange={() => {}}
        isLoading={isLoading}
        emptyState={
          <span className="text-sm text-muted-foreground">All items are above reorder thresholds.</span>
        }
      />
    </div>
  )
}
