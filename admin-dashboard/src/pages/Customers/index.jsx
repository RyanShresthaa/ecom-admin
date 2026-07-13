import { useMemo, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import { getCustomerColumns } from '@/pages/Customers/columns'
import { useCustomersQuery } from '@/hooks/useCustomers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function Customers() {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])

  const debouncedSearch = useDebouncedValue(search)

  const params = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: debouncedSearch,
      tag,
    }),
    [pagination, sorting, debouncedSearch, tag]
  )

  const { data, isLoading, isFetching, refetch } = useCustomersQuery(params)

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }

  const columns = useMemo(() => getCustomerColumns({}), [])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        description="View customer profiles, order history, lifetime value, and contact details."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={resetPage(setSearch)}
            searchPlaceholder="Search by name, email, phone, or ID…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select value={tag} onValueChange={resetPage(setTag)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Returning">Returning</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <DataTable
            columns={columns}
            data={data?.rows}
            pageCount={data?.pageCount}
            rowCount={data?.rowCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>
    </div>
  )
}
