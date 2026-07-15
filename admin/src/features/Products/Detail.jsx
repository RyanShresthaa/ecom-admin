'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, FloppyDisk, Package, SpinnerGap, Star } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/common/PageLoader'
import { ProductStatusBadge } from '@/components/common/StatusBadge'
import { ImageUpload } from '@/features/Products/ImageUpload'
import { VariantsEditor } from '@/features/Products/VariantsEditor'
import { ProductAnalytics } from '@/features/Products/ProductAnalytics'
import { useProductQuery, useUpdateProduct, useUploadProductImage } from '@/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'
import { CATEGORIES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ProductDetail() {
  const { id } = useParams()
  const { data: product, isLoading } = useProductQuery(id)
  const updateProduct = useUpdateProduct()
  const uploadImage = useUploadProductImage()
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.PRODUCTS_WRITE)

  const [form, setForm] = useState(null)

  if (isLoading) return <PageLoader />

  if (!product) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" asChild>
          <Link href="/products">Back to products</Link>
        </Button>
      </div>
    )
  }

  const current = form || product

  function update(field, value) {
    setForm((prev) => ({ ...(prev || product), [field]: value }))
  }

  function handleSave() {
    if (!form) return
    updateProduct.mutate({
      id: product.id,
      payload: {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        stock: form.variants?.length
          ? form.variants.reduce((s, v) => s + (v.stock || 0), 0)
          : Number(form.stock),
        sku: form.sku,
        status: form.status,
        description: form.description,
        variants: form.variants,
      },
    }, { onSuccess: () => setForm(null) })
  }

  function handleImageUpload(imageDataUrl) {
    uploadImage.mutate({ id: product.id, imageDataUrl })
  }

  const hasChanges = Boolean(form)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={product.name}
        description={`${product.id} · Added ${formatDate(product.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href="/products">
                <ArrowLeft size={14} />
                Back
              </Link>
            </Button>
            {canWrite && hasChanges && (
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={updateProduct.isPending}>
                {updateProduct.isPending ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                Save changes
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-5">
              {canWrite ? (
                <ImageUpload
                  image={product.image}
                  onUpload={handleImageUpload}
                  onRemove={() => updateProduct.mutate({ id: product.id, payload: { image: null } })}
                  isUploading={uploadImage.isPending}
                />
              ) : product.image ? (
                <img src={product.image} alt={product.name} className="aspect-square w-full max-w-[240px] rounded-lg object-cover" />
              ) : (
                <div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-lg bg-secondary">
                  <Package size={48} className="text-muted-foreground" />
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <ProductStatusBadge status={current.status} />
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star size={14} weight="fill" className="text-warning" />
                  {product.rating}
                </span>
              </div>

              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">{formatCurrency(current.price)}</p>
              <p className="text-sm text-muted-foreground">
                {current.variants?.length
                  ? `${current.variants.reduce((s, v) => s + v.stock, 0)} total stock across ${current.variants.length} variants`
                  : `${current.stock} in stock`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Product details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  {canWrite ? (
                    <Input value={current.name} onChange={(e) => update('name', e.target.value)} />
                  ) : (
                    <p className="text-sm">{current.name}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>SKU</Label>
                  {canWrite ? (
                    <Input value={current.sku} onChange={(e) => update('sku', e.target.value)} className="font-mono" />
                  ) : (
                    <p className="font-mono text-sm">{current.sku}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  {canWrite ? (
                    <Select value={current.category} onValueChange={(v) => update('category', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{current.category}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  {canWrite ? (
                    <Select value={current.status} onValueChange={(v) => update('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <ProductStatusBadge status={current.status} />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Price</Label>
                  {canWrite ? (
                    <Input type="number" min="0" step="0.01" value={current.price} onChange={(e) => update('price', e.target.value)} />
                  ) : (
                    <p className="text-sm">{formatCurrency(current.price)}</p>
                  )}
                </div>
                {!current.variants?.length && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Stock</Label>
                    {canWrite ? (
                      <Input type="number" min="0" value={current.stock} onChange={(e) => update('stock', e.target.value)} />
                    ) : (
                      <p className="text-sm">{current.stock}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                {canWrite ? (
                  <Textarea
                    value={current.description || ''}
                    onChange={(e) => update('description', e.target.value)}
                    rows={3}
                    placeholder="Product description…"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{current.description || 'No description.'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Variants {current.variants?.length ? `(${current.variants.length})` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VariantsEditor
                variants={current.variants || []}
                onChange={(variants) => update('variants', variants)}
                readOnly={!canWrite}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductAnalytics productId={product.id} />
    </div>
  )
}
