import { Link } from 'react-router-dom'
import { PencilSimple, Trash } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export function getBlogColumns({ onDelete, canWrite }) {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link to={`/blog/${row.original.id}/edit`} className="font-medium hover:underline">
          {row.original.title || 'Untitled'}
        </Link>
      ),
    },
    {
      accessorKey: 'published',
      header: 'Status',
      cell: ({ row }) =>
        row.original.published ? (
          <Badge>Published</Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => formatDate(row.original.updatedAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/blog/${row.original.id}/edit`} aria-label="Edit">
                <PencilSimple size={16} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => onDelete(row.original)}
              aria-label="Delete"
            >
              <Trash size={16} />
            </Button>
          </div>
        ) : null,
    },
  ]
}
