import { useEffect, useState } from 'react'
import { FloppyDisk, SpinnerGap } from '@phosphor-icons/react'

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
import { useCreatePurchaseOrder, useReorderSuggestionsQuery } from '@/hooks/useInventory'

import { PO_SUPPLIERS } from '@/lib/constants'

// Inventory page — dialog to create a purchase order with optional pre-filled line items.
export function CreatePurchaseOrderDialog({ open, onOpenChange, prefillItems = [] }) {
  const [supplier, setSupplier] = useState(PO_SUPPLIERS[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])

  const createPO = useCreatePurchaseOrder()
  const { data: suggestions } = useReorderSuggestionsQuery({ urgency: 'all' })

  // Reset form and map pre-filled reorder suggestions into line items on open.
  useEffect(() => {
    if (open) {
      setSupplier(PO_SUPPLIERS[0])
      setExpectedDate('')
      setNotes('')
      setItems(
        prefillItems.map((item) => ({
          inventoryId: item.inventoryId,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyOrdered: item.suggestedQty || 50,
          unitCost: 0,
        }))
      )
    }
  }, [open, prefillItems])

  // Add a low-stock suggestion as a new PO line item if not already included.
  function addSuggestion(suggestion) {
    if (items.some((it) => it.inventoryId === suggestion.inventoryId)) return
    setItems((prev) => [
      ...prev,
      {
        inventoryId: suggestion.inventoryId,
        productId: suggestion.productId,
        productName: suggestion.productName,
        sku: suggestion.sku,
        qtyOrdered: suggestion.suggestedQty,
        unitCost: 0,
      },
    ])
  }

  // Update qty or unit cost on a single PO line item.
  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  // Suggestions not yet added to the current PO line items.
  const availableSuggestions = suggestions?.rows?.filter(
    (s) => !items.some((it) => it.inventoryId === s.inventoryId)
  )

  // Validate and submit the purchase order to the API.
  function handleSubmit(e) {
    e.preventDefault()
    if (!supplier || items.length === 0) return

    createPO.mutate(
      {
        supplier,
        expectedDate: expectedDate || null,
        notes,
        items: items.map((item) => ({
          ...item,
          qtyOrdered: Number(item.qtyOrdered) || 0,
          unitCost: Number(item.unitCost) || 0,
        })),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  // Sum of qty × unit cost across all line items.
  const total = items.reduce((s, it) => s + Number(it.qtyOrdered) * Number(it.unitCost), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create purchase order</DialogTitle>
            <DialogDescription>Order stock from a supplier to replenish inventory.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Supplier</Label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PO_SUPPLIERS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expected date</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Line items</Label>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Add items from low-stock suggestions below.</p>
            )}
            {items.map((item, index) => (
              <div key={item.inventoryId} className="grid grid-cols-[1fr_80px_80px] gap-2 rounded-lg border border-border p-2">
                <div className="flex flex-col justify-center">
                  <span className="text-sm font-medium">{item.productName}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={item.qtyOrdered}
                  onChange={(e) => updateItem(index, 'qtyOrdered', e.target.value)}
                  className="h-8"
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                  className="h-8"
                  placeholder="Cost"
                />
              </div>
            ))}
            {availableSuggestions?.length > 0 && (
              <Select onValueChange={(id) => addSuggestion(availableSuggestions.find((s) => s.inventoryId === id))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Add low-stock item…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSuggestions.map((s) => (
                    <SelectItem key={s.inventoryId} value={s.inventoryId}>
                      {s.productName} (stock: {s.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2 text-sm">
            <span className="font-medium">Estimated total</span>
            <span className="font-mono font-semibold">${total.toFixed(2)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={items.length === 0 || createPO.isPending} className="gap-1.5">
              {createPO.isPending ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
              Create PO
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
