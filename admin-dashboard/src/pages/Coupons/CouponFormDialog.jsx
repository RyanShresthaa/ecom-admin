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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EMPTY = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  minOrderAmt: '0',
  maxUses: '',
  expiresAt: '',
  active: true,
}

function toLocalDatetimeValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CouponFormDialog({ open, onOpenChange, onSubmit, isSubmitting, coupon = null }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(coupon?.id)

  useEffect(() => {
    if (!open) return
    if (coupon) {
      setForm({
        code: coupon.code || '',
        discountType: coupon.discountType || 'percent',
        discountValue: coupon.discountValue === 0 || coupon.discountValue ? String(coupon.discountValue) : '',
        minOrderAmt: String(coupon.minOrderAmt ?? 0),
        maxUses: coupon.maxUses == null ? '' : String(coupon.maxUses),
        expiresAt: toLocalDatetimeValue(coupon.expiresAt),
        active: coupon.active !== false,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, coupon])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!form.code.trim()) next.code = 'Code is required'
    if (form.discountValue === '' || Number(form.discountValue) < 0) {
      next.discountValue = 'Enter a valid discount'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    onSubmit({
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmt: Number(form.minOrderAmt || 0),
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: form.active,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit coupon' : 'Create coupon'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update discount rules for this code.'
              : 'Customers can apply this code at checkout.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              placeholder="MATINA"
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.discountType} onValueChange={(v) => update('discountType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                min="0"
                value={form.discountValue}
                onChange={(e) => update('discountValue', e.target.value)}
                placeholder={form.discountType === 'percent' ? '10' : '500'}
              />
              {errors.discountValue && (
                <p className="text-xs text-destructive">{errors.discountValue}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min">Min order</Label>
              <Input
                id="min"
                type="number"
                min="0"
                value={form.minOrderAmt}
                onChange={(e) => update('minOrderAmt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max">Max uses</Label>
              <Input
                id="max"
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => update('maxUses', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expires (optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => update('expiresAt', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.active ? 'active' : 'inactive'}
              onValueChange={(v) => update('active', v === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <FloppyDisk size={14} />
              )}
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
