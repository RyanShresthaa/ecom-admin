'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CalendarBlank, Plus } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { getOrderColumns } from '@/features/Orders/columns'
import { BulkStatusBar } from '@/features/Orders/BulkStatusBar'
import { CreateOrderDialog } from '@/features/Orders/CreateOrderDialog'
import { useOrdersQuery } from '@/hooks/useOrders'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

export default function Orders() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }])
  const [rowSelection, setRowSelection] = useState({})
  const [createOpen, setCreateOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search)
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.ORDERS_WRITE)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      deliveryStatus,
      paymentStatus,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    }),
    [pagination, sorting, debouncedSearch, deliveryStatus, paymentStatus, dateFrom, dateTo]
  )

  const { data, isLoading, isFetching, refetch } = useOrdersQuery(params)

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  const columns = useMemo(
    () =>
      getOrderColumns({
        onView: (order) => router.push(`/orders/${order.id}`),
        enableSelection: canWrite,
        rowSelection,
        onRowSelectionChange: setRowSelection,
      }),
    [canWrite, rowSelection, router]
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders"
        description="Track, update, and review every order placed in your store."
        actions={
          canWrite && (
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus size={15} weight="bold" />
              Create order
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          {canWrite && (
            <BulkStatusBar selectedIds={selectedIds} onClear={() => setRowSelection({})} />
          )}

          <DataTableToolbar
            searchValue={search}
            onSearchChange={resetPage(setSearch)}
            searchPlaceholder="Search by order ID or customer…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <>
                <Select value={deliveryStatus} onValueChange={resetPage(setDeliveryStatus)}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All delivery</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentStatus} onValueChange={resetPage(setPaymentStatus)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5 rounded-md border border-input bg-card px-2 shadow-soft">
                  <CalendarBlank size={14} className="shrink-0 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => resetPage(setDateFrom)(e.target.value)}
                    className="h-9 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => resetPage(setDateTo)(e.target.value)}
                    className="h-9 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                  />
                </div>
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
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
