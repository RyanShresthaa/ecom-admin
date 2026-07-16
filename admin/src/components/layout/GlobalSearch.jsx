import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlass,
  Package,
  ShoppingCartSimple,
  Users,
  SpinnerGap,
} from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useGlobalSearch } from '@/hooks/useSearch'
import { cn, formatCurrency } from '@/lib/utils'

// Renders grouped search hits (orders, products, customers) inside the topbar dropdown or mobile dialog.
function SearchResults({ results, isFetching, query, onSelect }) {
  const hasQuery = query.trim().length >= 2
  const total =
    (results?.orders?.length ?? 0) +
    (results?.products?.length ?? 0) +
    (results?.customers?.length ?? 0)

  if (!hasQuery) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        Type at least 2 characters to search
      </p>
    )
  }

  if (isFetching && !results) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
        <SpinnerGap size={16} className="animate-spin" />
        Searching…
      </div>
    )
  }

  if (total === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        No results for &ldquo;{query}&rdquo;
      </p>
    )
  }

  return (
    <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1">
      {results.orders?.length > 0 && (
        <SearchGroup
          icon={ShoppingCartSimple}
          label="Orders"
          items={results.orders.map((order) => ({
            id: order.id,
            title: order.id,
            subtitle: `${order.customerName} · ${formatCurrency(order.totalAmount)}`,
            href: `/orders/${order.id}`,
          }))}
          onSelect={onSelect}
        />
      )}
      {results.products?.length > 0 && (
        <SearchGroup
          icon={Package}
          label="Products"
          items={results.products.map((product) => ({
            id: product.id,
            title: product.name,
            subtitle: `${product.sku} · ${formatCurrency(product.price)}`,
            href: `/products/${product.id}`,
          }))}
          onSelect={onSelect}
        />
      )}
      {results.customers?.length > 0 && (
        <SearchGroup
          icon={Users}
          label="Customers"
          items={results.customers.map((customer) => ({
            id: customer.id,
            title: customer.name,
            subtitle: customer.email,
            href: `/customers/${customer.id}`,
          }))}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

// Single result group with a section label and clickable rows.
function SearchGroup({ icon: Icon, label, items, onSelect }) {
  return (
    <div className="mb-1">
      <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.href)}
          className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-secondary"
        >
          <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

// Reusable search input with magnifying-glass icon, shared by desktop and mobile UIs.
function SearchField({ query, onQueryChange, inputRef, className, autoFocus, onFocus }) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlass
        size={16}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        placeholder="Search orders, products, customers…"
        className="pl-8"
        autoFocus={autoFocus}
      />
    </div>
  )
}

// Topbar omnisearch — debounced API lookup with ⌘K shortcut and a full-screen dialog on mobile.
export function GlobalSearch() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 300)
  const { data: results, isFetching } = useGlobalSearch(debouncedQuery, {
    enabled: open || mobileOpen,
  })

  // ⌘K / Ctrl+K opens search; Escape closes both desktop and mobile panels.
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (window.innerWidth < 768) {
          setMobileOpen(true)
        } else {
          setOpen(true)
          inputRef.current?.focus()
        }
      }
      if (event.key === 'Escape') {
        setOpen(false)
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close the desktop dropdown when the user clicks outside the search container.
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navigate to the selected entity and reset search state.
  function handleSelect(href) {
    navigate(href)
    setQuery('')
    setOpen(false)
    setMobileOpen(false)
  }

  return (
    <>
      <div ref={containerRef} className="relative ml-auto hidden w-full max-w-sm md:block">
        <SearchField
          query={query}
          onQueryChange={setQuery}
          inputRef={inputRef}
          onFocus={() => setOpen(true)}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
          ⌘K
        </kbd>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            <SearchResults
              results={results}
              isFetching={isFetching}
              query={debouncedQuery}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Search"
      >
        <MagnifyingGlass size={18} />
      </Button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="gap-3 p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <SearchField
            query={query}
            onQueryChange={setQuery}
            autoFocus
          />
          <div className="rounded-lg border border-border">
            <SearchResults
              results={results}
              isFetching={isFetching}
              query={debouncedQuery}
              onSelect={handleSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
