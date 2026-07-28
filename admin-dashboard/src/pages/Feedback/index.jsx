import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFeedbackQuery } from '@/hooks/useFeedback'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function Feedback() {
  const [search, setSearch] = useState('')
  const [targetType, setTargetType] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useFeedbackQuery({
    targetType,
    limit: 100,
  })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (f) =>
        f.comment.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.userName.toLowerCase().includes(q) ||
        f.userEmail.toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('userName', {
        header: 'From',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.userName}</span>
              <span className="text-[11px] text-muted-foreground">{row.userEmail}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('targetType', {
        header: 'Type',
        cell: (info) => <Badge variant="secondary">{info.getValue() || '—'}</Badge>,
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: (info) => (
          <span className="font-mono text-sm tabular-nums">
            {info.getValue() != null ? `${info.getValue()}/5` : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('comment', {
        header: 'Feedback',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="max-w-md">
              {row.title && (
                <p className="text-sm font-medium text-foreground">{row.title}</p>
              )}
              <p className="line-clamp-2 text-sm text-muted-foreground">{row.comment || '—'}</p>
            </div>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}
          </span>
        ),
      }),
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Feedback"
        description="Read messages and ratings customers submit from the contact form and storefront."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search feedback…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            }
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
    </div>
  )
}
