import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlass, Plus, SpinnerGap, Trash, X } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateOrder } from '@/hooks/useOrders'
import { useCustomersQuery } from '@/hooks/useCustomers'
import { useProductOptionsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAuth } from '@/context/AuthContext'
import { cn, formatCurrency } from '@/lib/utils'

const EMPTY_ITEM = { productId: '', variantId: '', qty: 1 }

export function CreateOrderDialog({ open, onOpenChange }) {
  const [customerId, setCustomerId] = useState('')
  const [customerLabel, setCustomerLabel] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [paymentStatus, setPaymentStatus] = useState('Paid')
  const [deliveryStatus, setDeliveryStatus] = useState('Pending')
  const [note, setNote] = useState('')
  const customerBoxRef = useRef(null)

  const createOrder = useCreateOrder()
  const { user } = useAuth()
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 250)

  const { data: customersData, isFetching: customersFetching } = useCustomersQuery({
    page: 0,
    pageSize: 20,
    sorting: [{ id: 'name', desc: false }],
    search: debouncedCustomerSearch,
  })
  const { data: productsData, refetch: refetchProducts } = useProductOptionsQuery({ status: 'active' })

  useEffect(() => {
    if (open) {
      refetchProducts()
      setCustomerId('')
      setCustomerLabel('')
      setCustomerSearch('')
      setCustomerMenuOpen(false)
      setItems([{ ...EMPTY_ITEM }])
      setPaymentStatus('Paid')
      setDeliveryStatus('Pending')
      setNote('')
    }
  }, [open, refetchProducts])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!customerBoxRef.current?.contains(event.target)) {
        setCustomerMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function selectCustomer(customer) {
    setCustomerId(customer.id)
    setCustomerLabel(`${customer.name} (${customer.email})`)
    setCustomerSearch('')
    setCustomerMenuOpen(false)
  }

  function clearCustomer() {
    setCustomerId('')
    setCustomerLabel('')
    setCustomerSearch('')
    setCustomerMenuOpen(true)
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function getProduct(productId) {
    return productsData?.rows?.find((p) => p.id === productId)
  }

  function getLineTotal(item) {
    const product = getProduct(item.productId)
    return (product?.price || 0) * item.qty
  }

  const total = items.reduce((sum, item) => sum + getLineTotal(item), 0)
  const customerMatches = customersData?.rows || []

  function handleSubmit(e) {
    e.preventDefault()
    if (!customerId || items.some((i) => !i.productId)) return

    createOrder.mutate(
      {
        customerId,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          qty: Number(i.qty),
        })),
        paymentStatus,
        deliveryStatus,
        note: note.trim() || undefined,
        author: user?.name,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create manual order</DialogTitle>
            <DialogDescription>Build an order by selecting a customer and line items.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5" ref={customerBoxRef}>
            <Label htmlFor="customer-search">Customer</Label>
            {customerId ? (
              <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <span className="truncate">{customerLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={clearCustomer}
                  aria-label="Clear customer"
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlass
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="customer-search"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setCustomerMenuOpen(true)
                  }}
                  onFocus={() => setCustomerMenuOpen(true)}
                  placeholder="Type customer name or email…"
                  className="pl-8"
                  autoComplete="off"
                />
                {customerMenuOpen && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                    {customersFetching && customerMatches.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">Searching…</p>
                    ) : customerMatches.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        {debouncedCustomerSearch ? 'No customers found' : 'Start typing to search customers'}
                      </p>
                    ) : (
                      customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={cn(
                            'flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm',
                            'hover:bg-accent hover:text-accent-foreground'
                          )}
                          onClick={() => selectCustomer(customer)}
                        >
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.email}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>Line items</Label>
            {items.map((item, index) => {
              const product = getProduct(item.productId)
              const variants = product?.variants || []

              return (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-[180px] flex-1">
                    <Select value={item.productId} onValueChange={(v) => updateItem(index, 'productId', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsData?.rows?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {formatCurrency(p.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {variants.length > 0 && (
                    <Select value={item.variantId} onValueChange={(v) => updateItem(index, 'variantId', v)}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.color}/{v.size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItem(index, 'qty', e.target.value)}
                    className="h-9 w-16"
                  />

                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(index)}>
                      <Trash size={14} className="text-destructive" />
                    </Button>
                  )}
                </div>
              )
            })}
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addItem}>
              <Plus size={14} />
              Add item
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Payment status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Delivery status</Label>
              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Internal note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3">
            <span className="text-sm font-medium">Order total</span>
            <span className="font-mono text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!customerId || createOrder.isPending} className="gap-1.5">
              {createOrder.isPending && <SpinnerGap size={14} className="animate-spin" />}
              Create order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
