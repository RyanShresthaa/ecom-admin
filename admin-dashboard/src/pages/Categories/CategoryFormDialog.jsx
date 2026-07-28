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
import { api } from '@/lib/api'

const EMPTY_FORM = {
  name: '',
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

export function CategoryFormDialog({ open, onOpenChange, category, onSubmit, isSubmitting }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const isEdit = Boolean(category)

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? { name: category.name ?? '', image: category.image ?? '' }
          : { ...EMPTY_FORM },
      )
      setErrors({})
    }
  }, [open, category])

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
      setErrors((prev) => ({
        ...prev,
        image: err.message || 'Upload failed',
      }))
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.image.trim()) next.image = 'Image is required'
    else if (!isHttpUrl(form.image.trim()) && !form.image.trim().startsWith('/')) {
      next.image = 'Enter a valid image URL or upload a file'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: form.name.trim(),
      image: form.image.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'Add category'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the category name or image.'
              : 'Create a catalog category. A default “General” subcategory is added so products can use it.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Handmade Jewelry"
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              Image <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="https://… or upload below"
            />
            <div className="flex items-center gap-3">
              <Label
                htmlFor="category-image-file"
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
                id="category-image-file"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploading || isSubmitting}
              />
              {form.image ? (
                <img
                  src={form.image}
                  alt=""
                  className="h-9 w-9 rounded-md object-cover border"
                />
              ) : null}
            </div>
            {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading} className="gap-1.5">
              {isSubmitting ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <FloppyDisk size={14} />
              )}
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
