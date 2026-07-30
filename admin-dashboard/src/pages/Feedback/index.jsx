import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  CalendarBlank,
  ChatCircleText,
  EnvelopeSimple,
  MapPin,
  Phone,
  Star,
  UserCircle,
} from '@phosphor-icons/react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DataTableToolbar } from '@/components/common/DataTableToolbar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFeedbackQuery } from '@/hooks/useFeedback'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate, getInitials } from '@/lib/utils'

const columnHelper = createColumnHelper()

function StarRating({ rating, size = 14 }) {
  const value = Number(rating) || 0
  if (!rating && rating !== 0) {
    return <span className="text-sm text-muted-foreground">No rating</span>
  }
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

function typeLabel(type) {
  if (!type) return 'General'
  return type.charAt(0).toUpperCase() + type.slice(1)
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

function dialogTitle(row) {
  if (!row) return 'Feedback'
  if (row.isContactForm) return 'Contact message'
  if (row.title && !/^Contact from\s+/i.test(row.title)) return row.title
  return 'Customer feedback'
}

export default function Feedback() {
  const [search, setSearch] = useState('')
  const [targetType, setTargetType] = useState('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selected, setSelected] = useState(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data = [], isLoading, isFetching, refetch } = useFeedbackQuery({
    targetType,
    limit: 100,
  })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (f) =>
        f.message.toLowerCase().includes(q) ||
        f.comment.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.userName.toLowerCase().includes(q) ||
        f.userEmail.toLowerCase().includes(q) ||
        (f.phone || '').toLowerCase().includes(q) ||
        (f.address || '').toLowerCase().includes(q),
    )
  }, [data, debouncedSearch])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  const columns = useMemo(
    () => [
      columnHelper.accessor('userName', {
        header: 'From',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(row.userName) || '?'}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{row.userName}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.userEmail || (row.accountLinked ? '—' : 'Contact form')}
                </span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('targetType', {
        header: 'Type',
        cell: (info) => <Badge variant="secondary">{typeLabel(info.getValue())}</Badge>,
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: (info) => <StarRating rating={info.getValue()} size={13} />,
      }),
      columnHelper.accessor('message', {
        header: 'Feedback',
        cell: (info) => {
          const row = info.row.original
          const preview = row.message || row.comment || '—'
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
    ],
    [],
  )

  const contactDetails = selected
    ? [
        selected.userEmail
          ? { icon: EnvelopeSimple, label: 'Email', value: selected.userEmail }
          : null,
        selected.phone ? { icon: Phone, label: 'Phone', value: selected.phone } : null,
        selected.address ? { icon: MapPin, label: 'Address', value: selected.address } : null,
      ].filter(Boolean)
    : []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Feedback"
        description="Read messages and ratings customers submit from the contact form and storefront."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            searchPlaceholder="Search feedback…"
            onRefresh={refetch}
            isFetching={isFetching}
            filters={
              <Select
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
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

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border bg-secondary/40 px-6 py-4 pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-base">{dialogTitle(selected)}</DialogTitle>
              {selected && (
                <Badge variant="secondary" className="capitalize">
                  {typeLabel(selected.targetType)}
                </Badge>
              )}
              {selected?.accountLinked && (
                <Badge variant="success">
                  <UserCircle size={12} weight="bold" />
                  Account
                </Badge>
              )}
            </div>
            <DialogDescription className="sr-only">
              Full feedback message from {selected?.userName || 'customer'}
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
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarBlank size={12} className="shrink-0" />
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>
                {selected.rating != null && (
                  <div className="shrink-0">
                    <StarRating rating={selected.rating} size={14} />
                  </div>
                )}
              </div>

              {contactDetails.length > 0 && (
                <div className="grid gap-px border-b border-border bg-border sm:grid-cols-1">
                  {contactDetails.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 bg-card px-6 py-3"
                      >
                        <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="break-words text-sm text-foreground">{item.value}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-col gap-2.5 px-6 py-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <ChatCircleText size={13} />
                  Message
                </p>
                <div className="rounded-lg border border-border bg-secondary/25 px-4 py-3.5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {selected.message || 'No message provided.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
