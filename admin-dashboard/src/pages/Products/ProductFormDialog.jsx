import { useEffect, useState } from 'react'
import {
  FloppyDisk,
  SpinnerGap,
  UploadSimple,
  Trash,
  Star,
  Plus,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
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
import { cn } from '@/lib/utils'

const EMPTY_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  sku: '',
  status: 'active',
  images: [],
}

const MAX_IMAGES = 12

function isHttpUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function productImages(product) {
  if (!product) return []
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.filter((u) => typeof u === 'string' && u.trim())
  }
  if (typeof product.image === 'string' && product.image.trim()) {
    return [product.image.trim()]
  }
  return []
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
  const [urlDraft, setUrlDraft] = useState('')
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
              images: productImages(product),
            }
          : { ...EMPTY_FORM, category: categories[0] ?? '', images: [] },
      )
      setUrlDraft('')
      setErrors({})
    }
  }, [open, product, categories, regionMode, usdNprRate, currency])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function setImages(next) {
    update('images', next)
  }

  function addImageUrls(urls) {
    const cleaned = urls.map((u) => String(u || '').trim()).filter(Boolean)
    if (!cleaned.length) return
    setForm((prev) => {
      const existing = new Set(prev.images)
      const merged = [...prev.images]
      for (const url of cleaned) {
        if (existing.has(url)) continue
        if (merged.length >= MAX_IMAGES) break
        merged.push(url)
        existing.add(url)
      }
      if (merged.length >= MAX_IMAGES && cleaned.length) {
        toast.message(`Maximum ${MAX_IMAGES} images per product`)
      }
      return { ...prev, images: merged }
    })
    setErrors((prev) => ({ ...prev, images: undefined }))
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) {
      setErrors((prev) => ({ ...prev, images: 'Please choose image files' }))
      return
    }

    const room = MAX_IMAGES - form.images.length
    if (room <= 0) {
      toast.message(`Maximum ${MAX_IMAGES} images per product`)
      return
    }

    const toUpload = imageFiles.slice(0, room)
    setUploading(true)
    try {
      const urls = []
      for (const file of toUpload) {
        urls.push(await api.products.uploadImage(file))
      }
      addImageUrls(urls)
      toast.success(urls.length === 1 ? 'Image uploaded' : `${urls.length} images uploaded`)
    } catch (err) {
      const message = err.message || 'Upload failed. Check Cloudinary env on the backend.'
      setErrors((prev) => ({ ...prev, images: message }))
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  function handleAddUrl() {
    const url = urlDraft.trim()
    if (!url) return
    if (!isHttpUrl(url) && !url.startsWith('/')) {
      setErrors((prev) => ({
        ...prev,
        images: 'Enter a valid image URL (https://...) or upload files',
      }))
      return
    }
    addImageUrls([url])
    setUrlDraft('')
  }

  function removeImage(index) {
    setImages(form.images.filter((_, i) => i !== index))
  }

  function setThumbnail(index) {
    if (index <= 0 || index >= form.images.length) return
    const next = [...form.images]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
    setImages(next)
    toast.success('Thumbnail updated')
  }

  function moveImage(index, delta) {
    const target = index + delta
    if (target < 0 || target >= form.images.length) return
    const next = [...form.images]
    ;[next[index], next[target]] = [next[target], next[index]]
    setImages(next)
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Product name is required'
    if (!form.category) next.category = 'Category is required'
    if (!form.price || Number(form.price) < 0) next.price = 'Enter a valid price'
    if (form.stock === '' || Number(form.stock) < 0) next.stock = 'Enter a valid stock quantity'
    if (!form.images.length) {
      next.images = 'Add at least one product image'
    } else if (form.images.some((u) => !isHttpUrl(u) && !u.startsWith('/'))) {
      next.images = 'Each image must be a valid URL (https://...) or upload'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...form,
      images: form.images,
      image: form.images[0],
      price: Number(form.price),
      stock: Number(form.stock),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit product' : 'Add new product'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update details, gallery images, and which image is the thumbnail.'
                : 'Add details and one or more images. The first image (or the one you star) is the thumbnail.'}
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

          <div className="flex flex-col gap-2">
            <Label>
              Product images <span className="text-destructive">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Upload or paste URLs. Star an image to use it as the thumbnail (shown in lists and
              cards). Max {MAX_IMAGES}.
            </p>

            {form.images.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.images.map((url, index) => {
                  const isThumb = index === 0
                  return (
                    <li
                      key={`${url}-${index}`}
                      className={cn(
                        'relative overflow-hidden rounded-md border bg-secondary/40',
                        isThumb && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      )}
                    >
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                      {isThumb ? (
                        <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          <Star size={10} weight="fill" />
                          Thumb
                        </span>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 bg-black/55 p-1">
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            title="Move left"
                            disabled={index === 0}
                            onClick={() => moveImage(index, -1)}
                            className="rounded p-0.5 text-white disabled:opacity-30 hover:bg-white/20"
                          >
                            <CaretLeft size={12} weight="bold" />
                          </button>
                          <button
                            type="button"
                            title="Move right"
                            disabled={index === form.images.length - 1}
                            onClick={() => moveImage(index, 1)}
                            className="rounded p-0.5 text-white disabled:opacity-30 hover:bg-white/20"
                          >
                            <CaretRight size={12} weight="bold" />
                          </button>
                        </div>
                        <div className="flex gap-0.5">
                          {!isThumb ? (
                            <button
                              type="button"
                              title="Set as thumbnail"
                              onClick={() => setThumbnail(index)}
                              className="rounded p-0.5 text-amber-300 hover:bg-white/20"
                            >
                              <Star size={12} weight="fill" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => removeImage(index)}
                            className="rounded p-0.5 text-red-300 hover:bg-white/20"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                No images yet
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor="image-file"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm shadow-soft hover:bg-accent"
              >
                {uploading ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : (
                  <UploadSimple size={14} />
                )}
                {uploading ? 'Uploading…' : 'Upload images'}
              </Label>
              <input
                id="image-file"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={uploading || isSubmitting || form.images.length >= MAX_IMAGES}
                onChange={handleFileChange}
              />
            </div>

            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Or paste image URL…"
                disabled={form.images.length >= MAX_IMAGES}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddUrl()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-1"
                disabled={!urlDraft.trim() || form.images.length >= MAX_IMAGES}
                onClick={handleAddUrl}
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
            {errors.images && <p className="text-xs text-destructive">{errors.images}</p>}
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
              {isSubmitting ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <FloppyDisk size={14} />
              )}
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
