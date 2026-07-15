import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FloppyDisk, SpinnerGap, WarningCircle } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useProductsQuery } from '@/hooks/useProducts'
import { CATEGORIES } from '@/lib/constants'

const EMPTY_FORM = {
  name: '',
  category: CATEGORIES[0],
  price: '',
  stock: '',
  sku: '',
  status: 'active',
}

function normalizeProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function ProductFormDialog({ open, onOpenChange, product, onSubmit, isSubmitting }) {
  const navigate = useNavigate()
  const nameInputRef = useRef(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [duplicateProduct, setDuplicateProduct] = useState(null)
  const isEdit = Boolean(product)

  const { data: catalog } = useProductsQuery(
    {
      page: 0,
      pageSize: 500,
      sorting: [{ id: 'name', desc: false }],
      search: '',
      category: 'all',
      status: 'all',
    },
    { enabled: open, staleTime: 15_000 }
  )

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              category: product.category,
              price: String(product.price),
              stock: String(product.stock),
              sku: product.sku,
              status: product.status,
            }
          : EMPTY_FORM
      )
      setErrors({})
      setDuplicateProduct(null)
    }
  }, [open, product])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function findDuplicateByName(name) {
    const normalized = normalizeProductName(name)
    if (!normalized) return null
    return (
      catalog?.rows?.find(
        (entry) =>
          entry.id !== product?.id && normalizeProductName(entry.name) === normalized
      ) || null
    )
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Product name is required'
    if (!form.price || Number(form.price) < 0) next.price = 'Enter a valid price'
    if (form.stock === '' || Number(form.stock) < 0) next.stock = 'Enter a valid stock quantity'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    const existing = findDuplicateByName(form.name)
    if (existing) {
      setDuplicateProduct(existing)
      setErrors({
        name: `"${existing.name}" is already used. Change the name or open the existing product.`,
      })
      return
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    })
  }

  function handleChangeName() {
    setDuplicateProduct(null)
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function handleViewExisting() {
    const existing = duplicateProduct
    setDuplicateProduct(null)
    onOpenChange(false)
    if (existing?.id) navigate(`/products/${existing.id}`)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit product' : 'Add new product'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the product details below.'
                  : 'Fill in the details to add a new product to your catalog.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                ref={nameInputRef}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Cotton Tee Classic"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={(v) => update('category', v)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="0.00"
                />
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
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                {isEdit ? 'Save changes' : 'Add product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(duplicateProduct)} onOpenChange={(next) => !next && setDuplicateProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <WarningCircle size={18} weight="bold" />
              </div>
              <AlertDialogTitle>Product name already exists</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-1">
              A product named <span className="font-medium text-foreground">“{duplicateProduct?.name}”</span> already
              exists
              {duplicateProduct?.sku ? (
                <>
                  {' '}
                  (SKU: <span className="font-mono">{duplicateProduct.sku}</span>)
                </>
              ) : null}
              . Change the name if this is a new product, or open the existing one if it’s the same product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleChangeName}>Change name</AlertDialogCancel>
            <AlertDialogAction onClick={handleViewExisting}>Open existing product</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
