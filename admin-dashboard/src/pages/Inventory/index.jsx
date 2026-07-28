import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Warning } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
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
import { getInventoryColumns } from '@/pages/Inventory/columns'
import { StockAdjustDialog } from '@/pages/Inventory/StockAdjustDialog'
import {
  useInventoryQuery,
  useWarehousesQuery,
  useAddStock,
  useRemoveStock,
  useTransferStock,
} from '@/hooks/useInventory'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function Inventory() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [warehouse, setWarehouse] = useState('all')
  const [stockLevel, setStockLevel] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([])
  const [dialog, setDialog] = useState({ open: false, mode: 'add', product: null })

  const debouncedSearch = useDebouncedValue(search)
  const { data: warehouses = [] } = useWarehousesQuery()

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
      warehouse,
      stockLevel,
    }),
    [pagination, sorting, debouncedSearch, warehouse, stockLevel],
  )

  const { data, isLoading, isFetching, refetch } = useInventoryQuery(params)
  const addStock = useAddStock()
  const removeStock = useRemoveStock()
  const transferStock = useTransferStock()

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  function openDialog(mode, product) {
    setDialog({ open: true, mode, product })
  }

  function handleSubmit(values) {
    const close = () => setDialog((d) => ({ ...d, open: false }))
    if (dialog.mode === 'add') {
      addStock.mutate(values, { onSuccess: close })
    } else if (dialog.mode === 'remove') {
      removeStock.mutate(values, { onSuccess: close })
    } else {
      transferStock.mutate(values, { onSuccess: close })
    }
  }

  const columns = useMemo(
    () =>
      getInventoryColumns({
        onAdd: (row) => openDialog('add', row),
        onRemove: (row) => openDialog('remove', row),
        onTransfer: (row) => openDialog('transfer', row),
      }),
    [],
  )

  const lowStockCount = data?.rows?.filter((r) => r.lowStock).length ?? 0
  const isSubmitting = addStock.isPending || removeStock.isPending || transferStock.isPending

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory"
        description="Check stock levels and add, remove, or transfer inventory between warehouses."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={resetPage(setSearch)}
            searchPlaceholder="Search by product name or SKU…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <>
                <Select value={warehouse} onValueChange={resetPage(setWarehouse)}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All warehouses</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stockLevel} onValueChange={resetPage(setStockLevel)}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Stock level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stock levels</SelectItem>
                    <SelectItem value="low">Low stock only</SelectItem>
                    <SelectItem value="ok">In stock only</SelectItem>
                  </SelectContent>
                </Select>

                {lowStockCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    <Warning size={12} weight="bold" />
                    {lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on this page
                  </span>
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
            getRowClassName={(row) =>
              row.lowStock ? 'bg-destructive/[0.04] hover:bg-destructive/[0.07]' : ''
            }
          />
        </CardContent>
      </Card>

      <StockAdjustDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        mode={dialog.mode}
        product={dialog.product}
        warehouses={warehouses}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
