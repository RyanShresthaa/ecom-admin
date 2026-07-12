import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowsDownUp, SpinnerGap } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DataTablePagination } from '@/components/common/DataTablePagination'

/**
 * Generic, server-driven data table.
 *
 * - Pagination and sorting are "manual": the parent owns the state and is
 *   responsible for passing already-paginated/sorted `data` (typically via
 *   a TanStack Query hook that forwards `pagination`/`sorting` to the API).
 * - `isFetching` shows a subtle overlay + spinner without unmounting the
 *   existing rows, so refetches feel instant rather than flashing a skeleton.
 */
export function DataTable({
  columns,
  data,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  sorting = [],
  onSortingChange,
  isLoading,
  isFetching,
  emptyState,
  getRowClassName,
  enableRowSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  getRowId,
}) {
  const sortingEnabled = Boolean(onSortingChange)

  const table = useReactTable({
    data: data ?? [],
    columns,
    pageCount: pageCount ?? -1,
    state: { pagination, sorting, ...(enableRowSelection ? { rowSelection } : {}) },
    onPaginationChange,
    onSortingChange: sortingEnabled ? onSortingChange : undefined,
    onRowSelectionChange: enableRowSelection ? onRowSelectionChange : undefined,
    manualPagination: true,
    manualSorting: true,
    enableSorting: sortingEnabled,
    enableRowSelection,
    getRowId: getRowId ?? ((row) => row.id),
    getCoreRowModel: getCoreRowModel(),
  })

  const showEmpty = !isLoading && data && data.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-lg border border-border bg-card">
        {isFetching && !isLoading && (
          <div className="absolute right-3 top-2.5 z-10 flex items-center gap-1.5 text-xs text-muted-foreground">
            <SpinnerGap size={14} className="animate-spin" />
            Updating…
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(canSort && 'cursor-pointer select-none')}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (sortDir === 'asc' ? (
                              <ArrowUp size={12} />
                            ) : sortDir === 'desc' ? (
                              <ArrowDown size={12} />
                            ) : (
                              <ArrowsDownUp size={12} className="opacity-30" />
                            ))}
                        </span>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination?.pageSize ?? 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, ci) => (
                    <TableCell key={ci}>
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  {emptyState ?? (
                    <span className="text-sm text-muted-foreground">No results found.</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={getRowClassName?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} rowCount={rowCount} isLoading={isLoading} />
    </div>
  )
}
