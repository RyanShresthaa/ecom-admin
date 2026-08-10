import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { getProductColumns } from '@/pages/Products/columns'
import { ProductFormDialog } from '@/pages/Products/ProductFormDialog'
import {
  useProductsQuery,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLocale } from '@/context/LocaleContext'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export default function Products() {
  const { regionMode, currency, usdNprRate, formatCatalogPrice, toBase, loading: localeLoading } =
    useLocale()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const debouncedSearch = useDebouncedValue(search)

  const fx = useMemo(
    () => ({
      regionMode: regionMode === 'nepal' ? 'nepal' : 'us',
      usdNprRate: Number(usdNprRate) > 0 ? Number(usdNprRate) : 133,
      currency: regionMode === 'nepal' ? 'NPR' : 'USD',
    }),
    [regionMode, usdNprRate],
  )

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: () => api.products.categories(),
  })

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
      category,
      status,
    }),
    [pagination, sorting, debouncedSearch, category, status],
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
    const payload = {
      ...values,
      // Form amount is in active display currency → persist catalog NPR
      price: toBase(Number(values.price)),
    }
    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, payload },
        { onSuccess: () => setFormOpen(false) },
      )
    } else {
      createProduct.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  function handleDeleteConfirm() {
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    })
  }

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit: openEditDialog,
        onDelete: setDeletingProduct,
        currency,
        formatPrice: formatCatalogPrice,
      }),
    // Remount column defs whenever region/FX changes so cells reformat
    [currency, formatCatalogPrice, regionMode, usdNprRate],
  )

  const sample = formatCatalogPrice(4200)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description={`Prices stored in NPR · showing ${currency} for ${regionMode === 'nepal' ? 'Nepal' : 'United States'} (1 USD = ${usdNprRate} NPR). Example: NPR 4,200 → ${sample}. Change region in Settings → Save.`}
        actions={
          <Button onClick={openAddDialog} className="gap-1.5">
            <Plus size={15} weight="bold" />
            Add product
          </Button>
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
            isFetching={isFetching || localeLoading}
            filters={
              <>
                <Select value={category} onValueChange={handleFilterChange(setCategory)}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
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
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />

          <DataTable
            key={`products-${regionMode}-${usdNprRate}-${currency}`}
            columns={columns}
            data={data?.rows}
            pageCount={data?.pageCount}
            rowCount={data?.rowCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading || localeLoading}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        fx={fx}
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
