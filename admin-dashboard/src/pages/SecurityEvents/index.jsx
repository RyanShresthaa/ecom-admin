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
import { useSecurityEventsQuery } from '@/hooks/useSecurityEvents'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function SecurityEvents() {
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 })

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useSecurityEventsQuery({ limit: 200 })

  const filtered = useMemo(() => {
    let rows = data
    if (outcome === 'ok') rows = rows.filter((r) => r.success)
    if (outcome === 'fail') rows = rows.filter((r) => !r.success)
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.action.toLowerCase().includes(q) ||
        String(row.userEmail).toLowerCase().includes(q) ||
        String(row.userId).toLowerCase().includes(q) ||
        String(row.ip).toLowerCase().includes(q),
    )
  }, [data, debouncedSearch, outcome])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'When',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: (info) => <span className="font-mono text-xs font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('success', {
        header: 'Result',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="success">OK</Badge>
          ) : (
            <Badge variant="destructive">Blocked</Badge>
          ),
      }),
      columnHelper.display({
        id: 'user',
        header: 'User',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="min-w-0">
              <p className="truncate text-sm">{row.userEmail || '—'}</p>
              {row.userId ? (
                <p className="font-mono text-[11px] text-muted-foreground">#{row.userId}</p>
              ) : null}
            </div>
          )
        },
      }),
      columnHelper.accessor('ip', {
        header: 'IP',
        cell: (info) => (
          <span className="font-mono text-[11px] text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'details',
        header: 'Details',
        cell: (info) => {
          const details = info.row.original.details
          const text =
            details && typeof details === 'object' && Object.keys(details).length
              ? JSON.stringify(details)
              : '—'
          return (
            <span className="line-clamp-2 max-w-[280px] font-mono text-[11px] text-muted-foreground">
              {text}
            </span>
          )
        },
      }),
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Security events"
        description="Auth and abuse signals — failed logins, lockouts, CSRF blocks, and rate limits. Separate from audit logs (admin business actions)."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search action, email, IP…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select
                value={outcome}
                onValueChange={(v) => {
                  setOutcome(v)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="ok">OK only</SelectItem>
                  <SelectItem value="fail">Blocked only</SelectItem>
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
