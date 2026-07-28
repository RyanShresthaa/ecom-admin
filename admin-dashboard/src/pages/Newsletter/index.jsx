import { useMemo, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { createColumnHelper } from '@tanstack/react-table'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { downloadNewsletterCsv, useNewsletterSubscribersQuery } from '@/hooks/useNewsletter'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function Newsletter() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 })
  const [exporting, setExporting] = useState(false)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useNewsletterSubscribersQuery()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.email.toLowerCase().includes(q) || String(row.source).toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => <span className="text-sm font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('active', {
        header: 'Status',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Subscribed',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}
          </span>
        ),
      }),
    ],
    [],
  )

  async function handleExport() {
    setExporting(true)
    try {
      await downloadNewsletterCsv()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Newsletter"
        description="Emails collected from the storefront footer and newsletter page. Export for campaigns."
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exporting || !data.length}
            onClick={handleExport}
          >
            <DownloadSimple size={15} />
            Export CSV
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
            searchPlaceholder="Search email or source…"
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
