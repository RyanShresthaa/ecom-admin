import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getBlogColumns } from '@/features/Blog/columns'
import { useBlogPostsQuery, useDeleteBlogPostMutation } from '@/hooks/useBlog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

export default function BlogPage() {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [toDelete, setToDelete] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.BLOG_WRITE)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      search: debouncedSearch,
    }),
    [pagination, debouncedSearch]
  )

  const { data, isLoading, isFetching, refetch } = useBlogPostsQuery(params)
  const deleteMutation = useDeleteBlogPostMutation()

  const columns = useMemo(
    () => getBlogColumns({ onDelete: setToDelete, canWrite }),
    [canWrite]
  )

  async function confirmDelete() {
    if (!toDelete) return
    await deleteMutation.mutateAsync(toDelete.id)
    setToDelete(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Blog"
        description="Write stories for your customers. Published posts appear on the store blog page."
        actions={
          canWrite && (
            <Button asChild className="gap-1.5">
              <Link to="/blog/new">
                <Plus size={15} weight="bold" />
                New post
              </Link>
            </Button>
          )
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
            searchPlaceholder="Search posts…"
            onRefresh={refetch}
            isFetching={isFetching}
          />

          <DataTable
            columns={columns}
            data={data?.rows ?? []}
            pageCount={data?.pageCount ?? 1}
            rowCount={data?.rowCount ?? 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
