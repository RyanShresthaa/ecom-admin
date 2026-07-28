import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Check, X } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import {
  useSellerRequestsQuery,
  useApproveSeller,
  useRejectSeller,
} from '@/hooks/useSellers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function Sellers() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useSellerRequestsQuery()
  const approve = useApproveSeller()
  const reject = useRejectSeller()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Applicant',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.name || '—'}</span>
              <span className="text-[11px] text-muted-foreground">{row.email}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('mobile', {
        header: 'Mobile',
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Requested',
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                className="h-8 gap-1"
                disabled={approve.isPending || reject.isPending}
                onClick={() => approve.mutate(row.id)}
              >
                <Check size={14} /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                disabled={approve.isPending || reject.isPending}
                onClick={() => reject.mutate(row.id)}
              >
                <X size={14} /> Reject
              </Button>
            </div>
          )
        },
      }),
    ],
    [approve, reject],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Seller requests"
        description="Approve or reject users who applied to sell products on Matina Crafts."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search applicants…"
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
            emptyState="No pending seller requests."
          />
        </CardContent>
      </Card>
    </div>
  )
}
