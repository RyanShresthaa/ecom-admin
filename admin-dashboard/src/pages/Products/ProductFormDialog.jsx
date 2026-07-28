import { useEffect, useState } from 'react'
import { FloppyDisk, SpinnerGap, UploadSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'

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
import { api } from '@/lib/api'
import { toDisplayAmount } from '@/lib/currency'

const EMPTY_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  sku: '',
  status: 'active',
  image: '',
}

function isHttpUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function ProductFormDialog({ open, onOpenChange, product, onSubmit, isSubmitting, fx }) {
  const regionMode = fx?.regionMode === 'nepal' ? 'nepal' : 'us'
  const currency = fx?.currency || (regionMode === 'nepal' ? 'NPR' : 'USD')
  const usdNprRate = Number(fx?.usdNprRate) > 0 ? Number(fx.usdNprRate) : 133
  const priceFx = { regionMode, usdNprRate, currency }

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])
  const [uploading, setUploading] = useState(false)
  const isEdit = Boolean(product)

  useEffect(() => {
    if (!open) return
    api.products.categories().then((names) => {
      setCategories(names)
      setForm((prev) => ({
        ...prev,
        category: prev.category || names[0] || '',
      }))
    })
  }, [open])

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              category: product.category,
              price: String(toDisplayAmount(product.price, priceFx)),
              stock: String(product.stock),
              sku: product.sku ?? '',
              status: product.status,
              image: product.image || '',
            }
          : { ...EMPTY_FORM, category: categories[0] ?? '' },
      )
      setErrors({})
    }
  }, [open, product, categories, regionMode, usdNprRate, currency])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please choose an image file' }))
      return
    }

    setUploading(true)
    try {
      const url = await api.products.uploadImage(file)
      update('image', url)
      toast.success('Image uploaded')
    } catch (err) {
      const message = err.message || 'Upload failed. Check Cloudinary env on the backend.'
      setErrors((prev) => ({ ...prev, image: message }))
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Product name is required'
    if (!form.category) next.category = 'Category is required'
    if (!form.price || Number(form.price) < 0) next.price = 'Enter a valid price'
    if (form.stock === '' || Number(form.stock) < 0) next.stock = 'Enter a valid stock quantity'
    if (!form.image.trim()) {
      next.image = 'Product image is required — upload a file or paste an image URL'
    } else if (!isHttpUrl(form.image.trim()) && !form.image.trim().startsWith('/')) {
      next.image = 'Enter a valid image URL (https://...) or upload a file'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...form,
      image: form.image.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit product' : 'Add new product'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the product details below.'
                : 'Fill in the details to add a new product. An image is required.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Cotton Tee Classic"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image">
              Product image <span className="text-destructive">*</span>
            </Label>
            <Input
              id="image"
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="https://... or upload below"
            />
            <div className="flex items-center gap-2">
              <Label
                htmlFor="image-file"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm shadow-soft hover:bg-accent"
              >
                {uploading ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : (
                  <UploadSimple size={14} />
                )}
                {uploading ? 'Uploading…' : 'Upload image'}
              </Label>
              <input
                id="image-file"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading || isSubmitting}
                onChange={handleFileChange}
              />
              {form.image ? (
                <a
                  href={form.image}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  Preview
                </a>
              ) : null}
            </div>
            {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
            {form.image ? (
              <img
                src={form.image}
                alt="Product preview"
                className="mt-1 h-24 w-24 rounded-md border object-cover"
              />
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => update('category', v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price ({currency})</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder="0.00"
              />
              {currency === 'USD' && (
                <p className="text-[11px] text-muted-foreground">
                  Saved as NPR · 1 USD = {usdNprRate} NPR
                </p>
              )}
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Stock quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => update('stock', e.target.value)}
                placeholder="0"
              />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sku">
              SKU <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => update('sku', e.target.value)}
              placeholder="Auto-generated if left blank"
            />
          </div>

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploading || categories.length === 0}
              className="gap-1.5"
            >
              {isSubmitting ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
