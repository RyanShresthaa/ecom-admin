import { useEffect, useState } from 'react'
import { FloppyDisk, Plus, SpinnerGap, Trash, UploadSimple } from '@phosphor-icons/react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

const EMPTY_LEARN = { title: '', description: '' }

const EMPTY = {
  title: '',
  slug: '',
  subtitle: '',
  content: '',
  category: '',
  image: '',
  learnSectionTitle: '',
  learnItems: [{ ...EMPTY_LEARN }],
  conclusion: '',
  published: true,
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
}

export function BlogFormDialog({ open, onOpenChange, onSubmit, isSubmitting, post = null }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const isEdit = Boolean(post?.id)

  useEffect(() => {
    if (!open) return
    if (post) {
      setForm({
        title: post.title || '',
        slug: post.slug || '',
        subtitle: post.subtitle || '',
        content: post.content || '',
        category: post.category || '',
        image: post.image || '',
        learnSectionTitle: post.learnSectionTitle || '',
        learnItems:
          Array.isArray(post.learnItems) && post.learnItems.length
            ? post.learnItems.map((i) => ({
                title: i.title || '',
                description: i.description || '',
              }))
            : [{ ...EMPTY_LEARN }],
        conclusion: post.conclusion || '',
        published: post.published !== false,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, post])

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'title' && !isEdit && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function updateLearn(index, field, value) {
    setForm((prev) => {
      const learnItems = prev.learnItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, learnItems }
    })
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await api.products.uploadImage(file)
      update('image', url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.content.trim()) next.content = 'Content is required'
    setErrors(next)
    if (Object.keys(next).length) return

    onSubmit({
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      subtitle: form.subtitle.trim(),
      content: form.content.trim(),
      category: form.category.trim(),
      image: form.image.trim(),
      learnSectionTitle: form.learnSectionTitle.trim(),
      learnItems: form.learnItems.filter((i) => i.title.trim() || i.description.trim()),
      conclusion: form.conclusion.trim(),
      published: form.published,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit post' : 'New journal post'}</DialogTitle>
          <DialogDescription>
            Published posts appear on the storefront Journal page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => update('slug', slugify(e.target.value))}
                placeholder="my-post-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={form.subtitle}
              onChange={(e) => update('subtitle', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Cover image</Label>
            <Input
              id="image"
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="https://… or upload below"
            />
            <div className="flex items-center gap-2">
              <Label
                htmlFor="blog-image-file"
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
                id="blog-image-file"
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
            {form.image ? (
              <img
                src={form.image}
                alt=""
                className="mt-1 h-24 w-auto rounded-md border border-border object-cover"
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={4}
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
            />
            {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="learnTitle">Learn section title</Label>
            <Input
              id="learnTitle"
              value={form.learnSectionTitle}
              onChange={(e) => update('learnSectionTitle', e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Learn items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    learnItems: [...prev.learnItems, { ...EMPTY_LEARN }],
                  }))
                }
              >
                <Plus size={12} />
                Add
              </Button>
            </div>
            {form.learnItems.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.title}
                    onChange={(e) => updateLearn(index, 'title', e.target.value)}
                    placeholder="Item title"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    disabled={form.learnItems.length <= 1}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        learnItems: prev.learnItems.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash size={14} />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) => updateLearn(index, 'description', e.target.value)}
                  placeholder="Description"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusion">Conclusion</Label>
            <Textarea
              id="conclusion"
              rows={3}
              value={form.conclusion}
              onChange={(e) => update('conclusion', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.published ? 'published' : 'draft'}
              onValueChange={(v) => update('published', v === 'published')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
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
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
