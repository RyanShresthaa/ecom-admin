import { useMemo, useState } from 'react'
import { Plus } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
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
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CsvImportExport } from '@/features/Products/CsvImportExport'
import { getProductColumns } from '@/features/Products/columns'
import { ProductFormDialog } from '@/features/Products/ProductFormDialog'
import {
  useProductsQuery,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'
import { CATEGORIES } from '@/lib/constants'

export default function Products() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const debouncedSearch = useDebouncedValue(search)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      category,
      status,
    }),
    [pagination, sorting, debouncedSearch, category, status]
  )

  const { data, isLoading, isFetching, refetch } = useProductsQuery(params)

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  function handleFilterChange(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  function openAddDialog() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function openEditDialog(product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleFormSubmit(values) {
    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, payload: values },
        { onSuccess: () => setFormOpen(false) }
      )
    } else {
      createProduct.mutate(values, {
        onSuccess: () => {
          setFormOpen(false)
          setSorting([{ id: 'createdAt', desc: true }])
          setPagination((p) => ({ ...p, pageIndex: 0 }))
        },
      })
    }
  }

  function handleDeleteConfirm() {
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    })
  }

  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.PRODUCTS_WRITE)

  const columns = useMemo(
    () => getProductColumns({ onEdit: openEditDialog, onDelete: setDeletingProduct, canWrite }),
    [canWrite]
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing, and stock levels."
        actions={
          <div className="flex items-center gap-2">
            {canWrite && <CsvImportExport />}
            {canWrite && (
              <Button onClick={openAddDialog} className="gap-1.5">
                <Plus size={15} weight="bold" />
                Add product
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search by name, SKU, or ID…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <>
                <Select value={category} onValueChange={handleFilterChange(setCategory)}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={handleFilterChange(setStatus)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSubmit={handleFormSubmit}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Delete this product?"
        description={
          deletingProduct
            ? `"${deletingProduct.name}" will be permanently removed from your catalog. This can't be undone.`
            : ''
        }
        confirmLabel="Delete product"
        isLoading={deleteProduct.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
