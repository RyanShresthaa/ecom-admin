import { useEffect, useState } from 'react'
import { ArrowsDownUp, SpinnerGap } from '@phosphor-icons/react'

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
import { useAdjustStock, useAdjustmentReasonsQuery } from '@/hooks/useInventory'
import { useAuth } from '@/context/AuthContext'

// Inventory stock tab — dialog to increase or decrease stock with a reason code.
export function StockAdjustmentDialog({ open, onOpenChange, item }) {
  const [reasonCode, setReasonCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [direction, setDirection] = useState('in')
  const [note, setNote] = useState('')

  const adjustStock = useAdjustStock()
  const { data: reasons } = useAdjustmentReasonsQuery()
  const { user } = useAuth()

  const selectedReason = reasons?.find((r) => r.code === reasonCode)

  // Reset form fields each time the dialog opens for a new item.
  useEffect(() => {
    if (open && item) {
      setReasonCode('')
      setQuantity('')
      setDirection('in')
      setNote('')
    }
  }, [open, item])

  // Lock direction to match the selected reason code type (in/out).
  useEffect(() => {
    if (selectedReason?.type === 'in') setDirection('in')
    else if (selectedReason?.type === 'out') setDirection('out')
  }, [selectedReason])

  // Validate inputs and submit the stock delta to the API.
  function handleSubmit(e) {
    e.preventDefault()
    if (!item) return
    const qty = Number(quantity)
    if (!reasonCode || !qty || qty <= 0) return

    const delta = direction === 'out' ? -qty : qty
    adjustStock.mutate(
      {
        inventoryId: item.id,
        delta,
        reasonCode,
        note: note.trim(),
        author: user?.name,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  // Preview resulting quantity after the proposed adjustment.
  const previewQty = item
    ? Math.max(0, item.stockQuantity + (direction === 'out' ? -Number(quantity || 0) : Number(quantity || 0)))
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {item && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Adjust stock</DialogTitle>
              <DialogDescription>
                {item.productName} · {item.sku} · Current: {item.stockQuantity} units
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label>Reason code</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons?.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Direction</Label>
                <Select
                  value={direction}
                  onValueChange={setDirection}
                  disabled={selectedReason?.type === 'in' || selectedReason?.type === 'out'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Increase (+)</SelectItem>
                    <SelectItem value="out">Decrease (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Additional details…" />
            </div>

            {quantity && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <ArrowsDownUp size={16} className="text-muted-foreground" />
                <span>
                  {item.stockQuantity} → <strong>{previewQty}</strong> units
                </span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!reasonCode || !quantity || adjustStock.isPending} className="gap-1.5">
                {adjustStock.isPending && <SpinnerGap size={14} className="animate-spin" />}
                Apply adjustment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
