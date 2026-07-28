import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { useAuditLogsQuery } from '@/hooks/useAudit'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 })

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useAuditLogsQuery({ limit: 100 })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.action.toLowerCase().includes(q) ||
        String(row.entityType).toLowerCase().includes(q) ||
        String(row.entityId).toLowerCase().includes(q) ||
        String(row.userId).toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'When',
        cell: (info) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: (info) => <span className="font-mono text-xs font-medium">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'entity',
        header: 'Entity',
        cell: (info) => {
          const row = info.row.original
          return (
            <span className="text-sm text-muted-foreground">
              {row.entityType || '—'}
              {row.entityId ? ` #${row.entityId}` : ''}
            </span>
          )
        },
      }),
      columnHelper.accessor('userId', {
        header: 'User',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('ip', {
        header: 'IP',
        cell: (info) => (
          <span className="font-mono text-[11px] text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit logs"
        description="History of admin actions (who changed what) for accountability and debugging."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search actions…"
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
    </div>
  )
}
