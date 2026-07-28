import { useMemo, useState } from 'react'
import { Plus } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { getCategoryColumns } from '@/pages/Categories/columns'
import { CategoryFormDialog } from '@/pages/Categories/CategoryFormDialog'
import {
  useCategoriesQuery,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function Categories() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deletingCategory, setDeletingCategory] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useCategoriesQuery()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q))
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  function openAddDialog() {
    setEditingCategory(null)
    setFormOpen(true)
  }

  function openEditDialog(category) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  function handleFormSubmit(values) {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, payload: values },
        { onSuccess: () => setFormOpen(false) },
      )
    } else {
      createCategory.mutate(values, { onSuccess: () => setFormOpen(false) })
    }
  }

  function handleDeleteConfirm() {
    deleteCategory.mutate(deletingCategory.id, {
      onSuccess: () => setDeletingCategory(null),
    })
  }

  const columns = useMemo(
    () => getCategoryColumns({ onEdit: openEditDialog, onDelete: setDeletingCategory }),
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Categories"
        description="Group products into categories. Each new category gets a General subcategory."
        actions={
          <Button onClick={openAddDialog} className="gap-1.5">
            <Plus size={15} weight="bold" />
            Add category
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
            searchPlaceholder="Search categories…"
            onRefresh={refetch}
            isFetching={isFetching}
          />

          <DataTable
            columns={columns}
            data={pageRows}
            isLoading={isLoading}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={Math.max(1, Math.ceil(filtered.length / pagination.pageSize))}
            rowCount={filtered.length}
          />
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSubmit={handleFormSubmit}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Delete category?"
        description={
          deletingCategory
            ? `“${deletingCategory.name}” will be removed. Categories with products cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete"
        isLoading={deleteCategory.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
