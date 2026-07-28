import { useMemo, useState } from 'react'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { createColumnHelper } from '@tanstack/react-table'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CouponFormDialog } from '@/pages/Coupons/CouponFormDialog'
import {
  useCouponsQuery,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/hooks/useCoupons'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCurrency } from '@/lib/utils'

const columnHelper = createColumnHelper()

export default function Coupons() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useCouponsQuery()
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter((c) => c.code.toLowerCase().includes(q))
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: 'Code',
        cell: (info) => (
          <span className="font-mono text-sm font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: 'discount',
        header: 'Discount',
        cell: (info) => {
          const c = info.row.original
          return c.discountType === 'percent'
            ? `${c.discountValue}%`
            : formatCurrency(c.discountValue)
        },
      }),
      columnHelper.accessor('minOrderAmt', {
        header: 'Min order',
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.display({
        id: 'uses',
        header: 'Uses',
        cell: (info) => {
          const c = info.row.original
          return (
            <span className="font-mono text-sm tabular-nums">
              {c.usedCount}
              {c.maxUses != null ? ` / ${c.maxUses}` : ''}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'active',
        header: 'Status',
        cell: (info) =>
          info.row.original.active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditing(info.row.original)
                setFormOpen(true)
              }}
            >
              <PencilSimple size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleting(info.row.original)}
            >
              <Trash size={14} />
            </Button>
          </div>
        ),
      }),
    ],
    [],
  )

  function closeForm(open) {
    setFormOpen(open)
    if (!open) setEditing(null)
  }

  const saving = createCoupon.isPending || updateCoupon.isPending

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Coupons"
        description="Create discount codes customers can apply at checkout."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus size={15} weight="bold" />
            Add coupon
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
            searchPlaceholder="Search by code…"
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

      <CouponFormDialog
        open={formOpen}
        onOpenChange={closeForm}
        coupon={editing}
        isSubmitting={saving}
        onSubmit={(values) => {
          if (editing?.id) {
            updateCoupon.mutate(
              { id: editing.id, ...values },
              { onSuccess: () => closeForm(false) },
            )
          } else {
            createCoupon.mutate(values, { onSuccess: () => closeForm(false) })
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete coupon?"
        description={deleting ? `Remove “${deleting.code}” permanently.` : undefined}
        confirmLabel="Delete"
        isLoading={deleteCoupon.isPending}
        onConfirm={() =>
          deleteCoupon.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  )
}
