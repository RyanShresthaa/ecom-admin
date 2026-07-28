import { createColumnHelper } from '@tanstack/react-table'
import { DotsThree, PencilSimple, Trash, Tag } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const columnHelper = createColumnHelper()

export function getCategoryColumns({ onEdit, onDelete }) {
  return [
    columnHelper.accessor('name', {
      header: 'Category',
      cell: (info) => {
        const category = info.row.original
        return (
          <div className="flex items-center gap-3">
            {category.image ? (
              <img
                src={category.image}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover bg-secondary"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Tag size={16} />
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{category.name}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-[11px] text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const category = info.row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <DotsThree size={18} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <PencilSimple size={14} /> Edit category
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(category)}
                >
                  <Trash size={14} /> Delete category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    }),
  ]
}
