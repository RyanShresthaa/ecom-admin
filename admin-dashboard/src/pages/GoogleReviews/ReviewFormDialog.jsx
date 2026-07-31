import { useEffect, useState } from 'react'
import { FloppyDisk, SpinnerGap } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EMPTY = {
  name: '',
  role: '',
  text: '',
  rating: 5,
  initials: '',
  color: '#8C523A',
  columnIndex: 0,
  isVisible: true,
}

export function ReviewFormDialog({ open, onOpenChange, onSubmit, isSubmitting, review = null }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(review?.id)

  useEffect(() => {
    if (!open) return
    if (review) {
      setForm({
        name: review.name || '',
        role: review.role || '',
        text: review.text || '',
        rating: Number(review.rating) || 5,
        initials: review.initials || '',
        color: review.color || '#8C523A',
        columnIndex: Number(review.columnIndex ?? 0),
        isVisible: review.isVisible !== false,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, review])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.text.trim()) next.text = 'Review text is required'
    const rating = Number(form.rating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) next.rating = 'Rating must be 1–5'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit({
      name: form.name.trim(),
      role: form.role.trim(),
      text: form.text.trim(),
      rating: Number(form.rating),
      initials: form.initials.trim(),
      color: form.color.trim() || '#8C523A',
      columnIndex: Number(form.columnIndex) || 0,
      isVisible: Boolean(form.isVisible),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit review' : 'Add review'}</DialogTitle>
          <DialogDescription>
            Homepage testimonials. Changes appear on the storefront when shown.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gr-name">Name</Label>
              <Input
                id="gr-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Sarah"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gr-role">Role / label</Label>
              <Input
                id="gr-role"
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                placeholder="Collector"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gr-text">Review</Label>
            <Textarea
              id="gr-text"
              value={form.text}
              onChange={(e) => setField('text', e.target.value)}
              rows={4}
              placeholder="Customer testimonial…"
            />
            {errors.text && <p className="text-xs text-destructive">{errors.text}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="gr-rating">Rating</Label>
              <Select
                value={String(form.rating)}
                onValueChange={(v) => setField('rating', Number(v))}
              >
                <SelectTrigger id="gr-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} stars
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gr-initials">Initials</Label>
              <Input
                id="gr-initials"
                value={form.initials}
                onChange={(e) => setField('initials', e.target.value)}
                placeholder="SA"
                maxLength={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gr-color">Accent</Label>
              <Input
                id="gr-color"
                type="color"
                value={form.color || '#8C523A'}
                onChange={(e) => setField('color', e.target.value)}
                className="h-9 cursor-pointer p-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Show on storefront</p>
              <p className="text-xs text-muted-foreground">Hidden reviews stay in this list</p>
            </div>
            <Switch
              checked={form.isVisible}
              onCheckedChange={(checked) => setField('isVisible', checked)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? <SpinnerGap size={15} className="animate-spin" /> : <FloppyDisk size={15} />}
              {isEdit ? 'Save changes' : 'Add review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
