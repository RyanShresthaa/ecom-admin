import { useMemo, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { useStockMovementsQuery } from '@/hooks/useInventory'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime } from '@/lib/utils'
import { createColumnHelper } from '@tanstack/react-table'
import { ADJUSTMENT_REASONS } from '@/lib/constants'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => <span className="text-sm text-muted-foreground">{formatDateTime(info.getValue())}</span>,
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
  columnHelper.accessor('reasonLabel', {
    header: 'Reason',
    cell: (info) => <span className="text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('delta', {
    header: 'Change',
    cell: (info) => {
      const val = info.getValue()
      return (
        <span className={`font-mono text-sm font-medium tabular-nums ${val > 0 ? 'text-success' : 'text-destructive'}`}>
          {val > 0 ? '+' : ''}{val}
        </span>
      )
    },
  }),
  columnHelper.display({
    id: 'qty',
    header: 'Before → After',
    cell: (info) => {
      const row = info.row.original
      return (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {row.previousQty} → {row.newQty}
        </span>
      )
    },
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('author', {
    header: 'By',
    cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
]

export function MovementHistoryTab() {
  const [search, setSearch] = useState('')
  const [reasonCode, setReasonCode] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])

  const debouncedSearch = useDebouncedValue(search)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      reasonCode,
    }),
    [pagination, sorting, debouncedSearch, reasonCode]
  )

  const { data, isLoading, isFetching, refetch } = useStockMovementsQuery(params)

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        searchValue={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder="Search movements…"
        onRefresh={refetch}
        isFetching={isFetching}
        filters={
          <Select value={reasonCode} onValueChange={resetPage(setReasonCode)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {ADJUSTMENT_REASONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        data={data?.rows}
        pageCount={data?.pageCount}
        rowCount={data?.rowCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </div>
  )
}
