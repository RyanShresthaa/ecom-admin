import { useEffect, useState } from 'react'
import { SpinnerGap } from '@phosphor-icons/react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TITLES = {
  add: 'Add stock',
  remove: 'Remove stock',
  transfer: 'Transfer stock',
}

export function StockAdjustDialog({
  open,
  onOpenChange,
  mode = 'add',
  product,
  warehouses = [],
  onSubmit,
  isSubmitting,
}) {
  const [quantity, setQuantity] = useState('1')
  const [warehouseId, setWarehouseId] = useState('')
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [reason, setReason] = useState(mode === 'remove' ? 'adjustment' : 'restock')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setQuantity('1')
    setReason(mode === 'remove' ? 'adjustment' : 'restock')
    setNote('')
    setError('')
    const first = warehouses[0]?.id || ''
    const second = warehouses[1]?.id || first
    setWarehouseId(product?.warehouseId || first)
    setFromWarehouseId(product?.warehouseId || first)
    setToWarehouseId(second)
  }, [open, mode, warehouses, product])

  function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      setError('Enter a positive quantity')
      return
    }
    if (mode === 'transfer') {
      if (!fromWarehouseId || !toWarehouseId) {
        setError('Select both warehouses')
        return
      }
      if (fromWarehouseId === toWarehouseId) {
        setError('Warehouses must be different')
        return
      }
      onSubmit({
        productId: product.productId,
        fromWarehouseId,
        toWarehouseId,
        quantity: qty,
        note: note.trim() || undefined,
      })
      return
    }
    onSubmit({
      productId: product.productId,
      warehouseId: warehouseId || undefined,
      quantity: qty,
      reason: reason.trim() || undefined,
      note: note.trim() || undefined,
    })
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {product.productName} · current stock {product.stockQuantity}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {mode === 'transfer' ? (
            <>
              <div className="space-y-2">
                <Label>From warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode !== 'transfer' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <SpinnerGap size={14} className="animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
