import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarBlank } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { getOrderColumns } from '@/pages/Orders/columns'
import { OrderDetailsDrawer } from '@/pages/Orders/OrderDetailsDrawer'
import { useOrdersQuery } from '@/hooks/useOrders'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLocale } from '@/context/LocaleContext'

export default function Orders() {
  const { formatCatalogPrice } = useLocale()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }])
  const [viewingOrder, setViewingOrder] = useState(null)

  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])

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

  const columns = useMemo(
    () => getOrderColumns({ onView: setViewingOrder, formatCatalogPrice }),
    [formatCatalogPrice],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders"
        description="View checkout orders and update delivery status."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
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
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
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
          />
        </CardContent>
      </Card>

      <OrderDetailsDrawer
        order={viewingOrder}
        open={Boolean(viewingOrder)}
        onOpenChange={(open) => !open && setViewingOrder(null)}
      />
    </div>
  )
}
