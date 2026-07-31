import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ArrowsClockwise,
  GoogleLogo,
  Eye,
  EyeSlash,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ReviewFormDialog } from '@/pages/GoogleReviews/ReviewFormDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useBulkGoogleReviewVisibility,
  useCreateGoogleReview,
  useDeleteGoogleReview,
  useGoogleReviewsQuery,
  useSetGoogleReviewVisibility,
  useSyncGoogleReviews,
  useUpdateGoogleReview,
} from '@/hooks/useGoogleReviews'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

function StarRow({ rating }) {
  return (
    <span className="font-mono text-sm tabular-nums text-amber-600">
      {'★'.repeat(rating)}
      <span className="text-muted-foreground">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default function GoogleReviews() {
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useGoogleReviewsQuery()
  const setOne = useSetGoogleReviewVisibility()
  const setAll = useBulkGoogleReviewVisibility()
  const syncReviews = useSyncGoogleReviews()
  const createReview = useCreateGoogleReview()
  const updateReview = useUpdateGoogleReview()
  const deleteReview = useDeleteGoogleReview()

  const filtered = useMemo(() => {
    let rows = data
    if (visibility === 'visible') rows = rows.filter((r) => r.isVisible)
    if (visibility === 'hidden') rows = rows.filter((r) => !r.isVisible)
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q),
    )
  }, [data, debouncedSearch, visibility])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const visibleCount = data.filter((r) => r.isVisible).length

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Reviewer',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: row.color }}
              >
                {row.initials || row.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{row.name}</span>
                <span className="text-[11px] text-muted-foreground">{row.role || '—'}</span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: (info) => <StarRow rating={Number(info.getValue()) || 0} />,
      }),
      columnHelper.accessor('text', {
        header: 'Review',
        cell: (info) => (
          <p className="max-w-lg line-clamp-2 text-sm text-muted-foreground">{info.getValue()}</p>
        ),
      }),
      columnHelper.accessor('isVisible', {
        header: 'On storefront',
        cell: (info) => {
          const row = info.row.original
          const shown = info.getValue()
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={shown}
                disabled={setOne.isPending}
                onCheckedChange={(checked) =>
                  setOne.mutate({ id: row.id, isVisible: checked })
                }
              />
              <Badge variant={shown ? 'success' : 'muted'}>
                {shown ? (
                  <>
                    <Eye size={11} weight="bold" /> Shown
                  </>
                ) : (
                  <>
                    <EyeSlash size={11} weight="bold" /> Hidden
                  </>
                )}
              </Badge>
            </div>
          )
        },
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
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(info.row.original)}
            >
              <Trash size={14} />
            </Button>
          </div>
        ),
      }),
    ],
    [setOne],
  )

  async function handleFormSubmit(payload) {
    if (editing?.id) {
      await updateReview.mutateAsync({ id: editing.id, payload })
    } else {
      await createReview.mutateAsync(payload)
    }
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Google reviews"
        description="Homepage testimonials stored in the database. Edit, show/hide, add, or delete anytime — or sync more from Google Places."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={syncReviews.isPending}
              onClick={() => syncReviews.mutate()}
            >
              <ArrowsClockwise
                size={15}
                className={syncReviews.isPending ? 'animate-spin' : undefined}
              />
              Sync from Google
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus size={15} weight="bold" />
              Add review
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{visibleCount}</span> of{' '}
              <span className="font-medium text-foreground">{data.length}</span> reviews shown on
              the homepage
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setAll.isPending || !data.length}
                onClick={() => setAll.mutate(true)}
              >
                Show all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setAll.isPending || !data.length}
                onClick={() => setAll.mutate(false)}
              >
                Hide all
              </Button>
            </div>
          </div>

          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search reviews…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select
                value={visibility}
                onValueChange={(v) => {
                  setVisibility(v)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">Shown</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            }
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
                <GoogleLogo size={28} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Add one here or sync from Google Places.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <ReviewFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        review={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createReview.isPending || updateReview.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review?"
        description={
          deleting
            ? `"${deleting.name}" will be removed from the homepage list. This can't be undone.`
            : ''
        }
        confirmLabel="Delete review"
        isLoading={deleteReview.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteReview.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          })
        }}
      />
    </div>
  )
}
