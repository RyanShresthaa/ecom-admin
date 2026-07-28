import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Check, X } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { useReturnsQuery, useUpdateReturn } from '@/hooks/useReturns'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

function statusBadge(status) {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return <Badge variant="success">Approved</Badge>
  if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="secondary">Requested</Badge>
}

export default function Returns() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [notes, setNotes] = useState({})

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useReturnsQuery()
  const updateReturn = useUpdateReturn()

  const filtered = useMemo(() => {
    let rows = data
    if (status !== 'all') {
      rows = rows.filter((r) => (r.status || '').toLowerCase() === status)
    }
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.id.includes(q) ||
          r.orderRowId.includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.userId.includes(q),
      )
    }
    return rows
  }, [data, status, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Return ID',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('orderRowId', {
        header: 'Order row',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('reason', {
        header: 'Reason',
        cell: (info) => (
          <span className="line-clamp-2 max-w-[240px] text-sm text-muted-foreground">
            {info.getValue() || '—'}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => statusBadge(info.getValue()),
      }),
      columnHelper.display({
        id: 'note',
        header: 'Admin note',
        cell: (info) => {
          const row = info.row.original
          if ((row.status || '').toLowerCase() !== 'requested') {
            return <span className="text-xs text-muted-foreground">{row.adminNote || '—'}</span>
          }
          return (
            <Input
              className="h-8 w-[160px]"
              placeholder="Note…"
              value={notes[row.id] ?? ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
            />
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const row = info.row.original
          if ((row.status || '').toLowerCase() !== 'requested') return null
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                disabled={updateReturn.isPending}
                onClick={() =>
                  updateReturn.mutate({
                    id: row.id,
                    status: 'approved',
                    adminNote: notes[row.id] || '',
                  })
                }
              >
                <Check size={14} /> Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-destructive"
                disabled={updateReturn.isPending}
                onClick={() =>
                  updateReturn.mutate({
                    id: row.id,
                    status: 'rejected',
                    adminNote: notes[row.id] || '',
                  })
                }
              >
                <X size={14} /> Reject
              </Button>
            </div>
          )
        },
      }),
    ],
    [notes, updateReturn],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Returns"
        description="Review customer return requests — approve to restore stock or reject with a note."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search returns…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
