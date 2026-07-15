import { useMemo, useState } from 'react'
import { CaretDown, CheckCircle } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { usePurchaseOrdersQuery, useUpdatePurchaseOrderStatus } from '@/hooks/useInventory'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper()

const STATUS_VARIANTS = {
  draft: 'muted',
  sent: 'default',
  partial: 'warning',
  received: 'success',
  cancelled: 'destructive',
}

const STATUS_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['partial', 'received', 'cancelled'],
  partial: ['received', 'cancelled'],
  received: [],
  cancelled: [],
}

function POStatusDropdown({ po }) {
  const updateStatus = useUpdatePurchaseOrderStatus()
  const options = STATUS_TRANSITIONS[po.status] || []

  if (options.length === 0) {
    return <Badge variant={STATUS_VARIANTS[po.status]}>{po.status}</Badge>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1">
        <Badge variant={STATUS_VARIANTS[po.status]}>{po.status}</Badge>
        <CaretDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => updateStatus.mutate({ id: po.id, status })}
          >
            Mark as {status}
            {status === po.status && <CheckCircle size={14} weight="fill" className="ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PurchaseOrdersTab({ onCreatePO }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])

  const debouncedSearch = useDebouncedValue(search)
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.INVENTORY_WRITE)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      status,
    }),
    [pagination, sorting, debouncedSearch, status]
  )

  const { data, isLoading, isFetching, refetch } = usePurchaseOrdersQuery(params)

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'PO #',
        cell: (info) => <span className="font-mono text-xs font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('supplier', {
        header: 'Supplier',
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('items', {
        header: 'Ordered qty',
        cell: (info) => {
          const items = info.getValue() || []
          const totalOrdered = items.reduce((sum, item) => sum + (Number(item.qtyOrdered) || 0), 0)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-sm font-medium tabular-nums">{totalOrdered}</span>
              <span className="text-[11px] text-muted-foreground">
                {items.length} product{items.length === 1 ? '' : 's'}
              </span>
              {items.slice(0, 2).map((item) => (
                <span key={`${item.inventoryId}-${item.sku}`} className="text-[11px] text-muted-foreground">
                  {item.productName}: {Number(item.qtyOrdered) || 0}
                  {item.currentStock != null ? ` (stock ${item.currentStock})` : ''}
                </span>
              ))}
              {items.length > 2 && (
                <span className="text-[11px] text-muted-foreground">+{items.length - 2} more</span>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('totalCost', {
        header: 'Total',
        cell: (info) => (
          <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) =>
          canWrite ? (
            <POStatusDropdown po={info.row.original} />
          ) : (
            <Badge variant={STATUS_VARIANTS[info.row.original.status]}>{info.row.original.status}</Badge>
          ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor('expectedDate', {
        header: 'Expected',
        cell: (info) => {
          const val = info.getValue()
          return <span className="text-sm text-muted-foreground">{val ? formatDate(val) : '—'}</span>
        },
      }),
    ],
    [canWrite]
  )

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        searchValue={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder="Search POs…"
        onRefresh={refetch}
        isFetching={isFetching}
        filters={
          <>
            <Select value={status} onValueChange={resetPage(setStatus)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && (
              <Button size="sm" onClick={() => onCreatePO([])}>
                New purchase order
              </Button>
            )}
          </>
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
