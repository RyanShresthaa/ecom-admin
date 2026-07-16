import { useMemo, useState } from 'react'
import { Warning } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { getInventoryColumns } from '@/features/Inventory/columns'
import { StockAdjustmentDialog } from '@/features/Inventory/StockAdjustmentDialog'
import { MovementHistoryTab } from '@/features/Inventory/MovementHistoryTab'
import { ReorderSuggestionsTab } from '@/features/Inventory/ReorderSuggestionsTab'
import { PurchaseOrdersTab } from '@/features/Inventory/PurchaseOrdersTab'
import { CreatePurchaseOrderDialog } from '@/features/Inventory/CreatePurchaseOrderDialog'
import { useInventoryQuery /*, useWarehousesQuery */ } from '@/hooks/useInventory'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

// Inventory page — tabbed hub for stock levels, movements, reorder suggestions, and purchase orders.
export default function Inventory() {
  const [search, setSearch] = useState('')
  // When need to add different store
  // const [warehouse, setWarehouse] = useState('all')
  const [stockLevel, setStockLevel] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([])
  const [adjustingItem, setAdjustingItem] = useState(null)
  const [poOpen, setPoOpen] = useState(false)
  const [poPrefill, setPoPrefill] = useState([])

  const debouncedSearch = useDebouncedValue(search)
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.INVENTORY_WRITE)

  // Build API query params from pagination, sorting, search, and stock-level filter.
  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      // When need to add different store
      // warehouse,
      stockLevel,
    }),
    [pagination, sorting, debouncedSearch, stockLevel]
  )

  const { data, isLoading, isFetching, refetch } = useInventoryQuery(params)
  // When need to add different store
  // const { data: warehouses = [] } = useWarehousesQuery()

  // Reset to page 0 whenever a filter or search value changes.
  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  // Open the create-PO dialog, optionally pre-filled from reorder suggestions.
  function openCreatePO(items = []) {
    setPoPrefill(items)
    setPoOpen(true)
  }

  // Count low-stock items on the current page for the warning badge.
  const lowStockCount = data?.rows?.filter((r) => r.lowStock).length ?? 0

  // Configure stock-level table columns with optional adjust action.
  const columns = useMemo(
    () => getInventoryColumns({ onAdjust: setAdjustingItem, canWrite }),
    [canWrite]
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, adjust inventory, track movements, and manage purchase orders."
      />

      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="stock">
            <TabsList className="mb-4">
              <TabsTrigger value="stock">Stock levels</TabsTrigger>
              <TabsTrigger value="movements">Movement history</TabsTrigger>
              <TabsTrigger value="reorder">Reorder suggestions</TabsTrigger>
              <TabsTrigger value="purchase-orders">Purchase orders</TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="flex flex-col gap-4">
              <DataTableToolbar
                searchValue={search}
                onSearchChange={resetPage(setSearch)}
                searchPlaceholder="Search by product name or SKU…"
                onRefresh={refetch}
                isFetching={isFetching}
                filters={
                  <>
                    {/* When need to add different store
                    <Select value={warehouse} onValueChange={resetPage(setWarehouse)}>
                      <SelectTrigger className="h-9 w-[200px]">
                        <SelectValue placeholder="Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All warehouses</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    */}

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
                getRowClassName={(row) => (row.lowStock ? 'bg-destructive/[0.04] hover:bg-destructive/[0.07]' : '')}
              />
            </TabsContent>

            <TabsContent value="movements">
              <MovementHistoryTab />
            </TabsContent>

            <TabsContent value="reorder">
              <ReorderSuggestionsTab onCreatePO={openCreatePO} />
            </TabsContent>

            <TabsContent value="purchase-orders">
              <PurchaseOrdersTab onCreatePO={openCreatePO} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StockAdjustmentDialog
        open={Boolean(adjustingItem)}
        onOpenChange={(open) => !open && setAdjustingItem(null)}
        item={adjustingItem}
      />

      <CreatePurchaseOrderDialog
        open={poOpen}
        onOpenChange={setPoOpen}
        prefillItems={poPrefill}
      />
    </div>
  )
}
