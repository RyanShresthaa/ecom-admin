import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { CalendarBlank, ChatCircleText, Package, Star, Trash } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductReviewsQuery, useDeleteProductReview } from '@/hooks/useProductReviews'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

function StarRating({ rating, size = 14 }) {
  const value = Number(rating) || 0
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          weight={i < value ? 'fill' : 'regular'}
          className={i < value ? 'text-amber-500' : 'text-muted-foreground/40'}
        />
      ))}
      <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
        {value}/5
      </span>
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return formatDate(value)
  }
}

export default function ProductReviews() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useProductReviewsQuery()
  const deleteReview = useDeleteProductReview()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (r) =>
        (r.productName || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q) ||
        (r.comment || '').toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('productName', {
        header: 'Product',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Package size={14} className="shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium">{info.getValue() || '—'}</span>
          </div>
        ),
      }),
      columnHelper.accessor('userName', {
        header: 'Customer',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(row.userName) || '?'}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{row.userName || '—'}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.userEmail || '—'}
                </span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: (info) => <StarRating rating={info.getValue()} size={13} />,
      }),
      columnHelper.accessor('comment', {
        header: 'Review',
        cell: (info) => {
          const row = info.row.original
          const preview = row.comment || '—'
          return (
            <button
              type="button"
              onClick={() => setSelected(row)}
              className="group max-w-md cursor-pointer rounded-md px-1.5 py-1 text-left transition-colors hover:bg-secondary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100">
                <ChatCircleText size={12} weight="bold" />
                View details
              </span>
            </button>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.getValue() ? formatDate(info.getValue()) : '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(row.original)}
          >
            <Trash size={14} />
            Delete
          </Button>
        ),
      }),
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Product reviews"
        description="Ratings and comments customers leave on product pages. Delete inappropriate reviews here."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search by product, customer, or comment…"
            onRefresh={refetch}
            isFetching={isFetching}
          />
          <DataTable
            columns={columns}
            data={pageRows}
            isLoading={isLoading}
            isFetching={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={Math.max(1, Math.ceil(filtered.length / pagination.pageSize))}
            rowCount={filtered.length}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Star size={28} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No product reviews yet.</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border bg-secondary/40 px-6 py-4 pr-12">
            <DialogTitle className="text-base">Product review</DialogTitle>
            <DialogDescription className="sr-only">
              Full review from {selected?.userName || 'customer'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(selected.userName) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected.userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{selected.userEmail}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarBlank size={12} className="shrink-0" />
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>
                <StarRating rating={selected.rating} size={14} />
              </div>

              <div className="border-b border-border px-6 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Product
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selected.productName || '—'}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 px-6 py-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <ChatCircleText size={13} />
                  Comment
                </p>
                <div className="rounded-lg border border-border bg-secondary/25 px-4 py-3.5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {selected.comment || 'No comment provided.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review?"
        description={
          deleting
            ? `Remove the ${deleting.rating}/5 review by ${deleting.userName || 'this customer'} on "${deleting.productName || 'this product'}"? This can't be undone.`
            : ''
        }
        confirmLabel="Delete review"
        isLoading={deleteReview.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteReview.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
              if (selected?.id === deleting.id) setSelected(null)
            },
          })
        }}
      />
    </div>
  )
}
