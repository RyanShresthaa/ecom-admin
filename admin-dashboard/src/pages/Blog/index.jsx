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
import { BlogFormDialog } from '@/pages/Blog/BlogFormDialog'
import {
  useBlogPostsQuery,
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
} from '@/hooks/useBlog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const columnHelper = createColumnHelper()

export default function Blog() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useBlogPostsQuery()
  const createPost = useCreateBlogPost()
  const updatePost = useUpdateBlogPost()
  const deletePost = useDeleteBlogPost()

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Title',
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{info.getValue()}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {info.row.original.slug}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: (info) =>
          info.row.original.published ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          ),
      }),
      columnHelper.accessor('publishedAt', {
        header: 'Published',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {info.getValue() ? new Date(info.getValue()).toLocaleDateString() : '—'}
          </span>
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

  const saving = createPost.isPending || updatePost.isPending

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Journal"
        description="Create and edit storefront blog posts. Seeded posts from the original journal are already in the database."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus size={15} weight="bold" />
            New post
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
            searchPlaceholder="Search title, slug, category…"
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

      <BlogFormDialog
        open={formOpen}
        onOpenChange={closeForm}
        post={editing}
        isSubmitting={saving}
        onSubmit={(values) => {
          if (editing?.id) {
            updatePost.mutate(
              { id: editing.id, ...values },
              { onSuccess: () => closeForm(false) },
            )
          } else {
            createPost.mutate(values, { onSuccess: () => closeForm(false) })
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete post?"
        description={deleting ? `Remove “${deleting.title}” permanently.` : undefined}
        confirmLabel="Delete"
        isLoading={deletePost.isPending}
        onConfirm={() =>
          deletePost.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  )
}
