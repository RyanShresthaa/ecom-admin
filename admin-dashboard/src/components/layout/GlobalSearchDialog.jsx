import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlass,
  Package,
  ShoppingCart,
  User,
  SpinnerGap,
} from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useGlobalSearchQuery } from '@/hooks/useGlobalSearch'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'customers', label: 'Customers', icon: User },
]

export function GlobalSearchDialog({ open, onOpenChange }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { data, isFetching, isLoading } = useGlobalSearchQuery(debouncedQuery)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpenChange])

  const hasQuery = debouncedQuery.trim().length >= 2
  const results = data ?? { products: [], orders: [], customers: [] }
  const totalResults =
    results.products.length + results.orders.length + results.customers.length

  function handleSelect(href) {
    onOpenChange(false)
    navigate(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              placeholder="Search orders, products, customers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 pl-8 shadow-none focus-visible:ring-0"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded border border-border bg-muted px-1">⌘K</kbd> to open
            anytime
          </p>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto p-2">
          {!hasQuery && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}

          {hasQuery && (isLoading || isFetching) && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <SpinnerGap size={16} className="animate-spin" />
              Searching…
            </div>
          )}

          {hasQuery && !isFetching && totalResults === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {hasQuery && !isFetching && totalResults > 0 && (
            <div className="flex flex-col gap-3">
              {SECTIONS.map(({ key, label, icon: Icon }) => {
                const items = results[key] ?? []
                if (items.length === 0) return null
                return (
                  <div key={key}>
                    <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(item.href)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left',
                              'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                          >
                            <Icon size={16} className="shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{item.label}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.sublabel}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
