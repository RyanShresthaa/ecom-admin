import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FloppyDisk, SpinnerGap } from '@phosphor-icons/react'

import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/features/Blog/RichTextEditor'
import { CoverImageField } from '@/features/Blog/CoverImageField'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { BlogLivePreview } from '@/features/Blog/BlogLivePreview'
import {
  useBlogPostQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
} from '@/hooks/useBlog'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

const EMPTY = {
  title: '',
  excerpt: '',
  coverImage: '',
  body: '',
  published: false,
}

const FIELD_HELP = {
  title: 'The main headline customers see at the top of the article.',
  excerpt: 'One or two sentences — shown on the blog list before they click in.',
  coverImage: 'Upload from your device (recommended), or paste a direct image URL. Google Images page links will not work — right-click → Copy image address.',
  body: 'Use the toolbar for bold, lists, headings, links, images, and more — like Word.',
  publish: 'Turn on when you are ready for customers to read it on the store.',
}

export default function BlogEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.BLOG_WRITE)

  const { data: post, isLoading } = useBlogPostQuery(isNew ? null : id)
  const createMutation = useCreateBlogPostMutation()
  const updateMutation = useUpdateBlogPostMutation()

  const [form, setForm] = useState(EMPTY)
  const [activeSection, setActiveSection] = useState('title')

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title || '',
        excerpt: post.excerpt || '',
        coverImage: post.coverImage || '',
        body: post.body || '',
        published: Boolean(post.published),
      })
    }
  }, [post])

  const busy = createMutation.isPending || updateMutation.isPending

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!canWrite) return
    if (!form.title.trim()) return

    if (isNew) {
      const created = await createMutation.mutateAsync(form)
      navigate(`/blog/${created.id}/edit`, { replace: true })
    } else {
      await updateMutation.mutateAsync({ id, payload: form })
    }
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-muted-foreground">Loading post…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={isNew ? 'New blog post' : 'Edit blog post'}
        description="Fill in each section on the left. The preview on the right highlights what you are editing."
        actions={
          <Button variant="outline" asChild>
            <Link to="/blog" className="gap-1.5">
              <ArrowLeft size={15} />
              Back to list
            </Link>
          </Button>
        }
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> click a field → the matching box
          lights up in the preview → save as draft or publish when ready. Customers only see published
          posts under <em>Blog</em> on the store.
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <Field
            section="title"
            label="1. Title"
            help={FIELD_HELP.title}
            activeSection={activeSection}
            onFocus={setActiveSection}
          >
            <Input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="e.g. How we make our woven baskets"
              required
              disabled={!canWrite}
            />
          </Field>

          <Field
            section="excerpt"
            label="2. Short summary"
            help={FIELD_HELP.excerpt}
            activeSection={activeSection}
            onFocus={setActiveSection}
          >
            <Textarea
              value={form.excerpt}
              onChange={(e) => setField('excerpt', e.target.value)}
              placeholder="A quick intro for the blog list page…"
              rows={3}
              disabled={!canWrite}
            />
          </Field>

          <Field
            section="cover"
            label="3. Cover image (optional)"
            help={FIELD_HELP.coverImage}
            activeSection={activeSection}
            onFocus={setActiveSection}
          >
            <CoverImageField
              value={form.coverImage}
              onChange={(url) => setField('coverImage', url)}
              disabled={!canWrite}
            />
          </Field>

          <Field
            section="body"
            label="4. Article text"
            help={FIELD_HELP.body}
            activeSection={activeSection}
            onFocus={setActiveSection}
          >
            <RichTextEditor
              value={form.body}
              onChange={(html) => setField('body', html)}
              onFocus={() => setActiveSection('body')}
              disabled={!canWrite}
            />
          </Field>

          <Field
            section="publish"
            label="5. Publish"
            help={FIELD_HELP.publish}
            activeSection={activeSection}
            onFocus={setActiveSection}
          >
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setField('published', v)}
                disabled={!canWrite}
              />
              <div>
                <p className="text-sm font-medium">{form.published ? 'Published' : 'Draft'}</p>
                <p className="text-xs text-muted-foreground">
                  {form.published
                    ? 'Live on the customer blog now.'
                    : 'Only visible here in admin until you publish.'}
                </p>
              </div>
            </div>
          </Field>

          {canWrite && (
            <Button type="submit" disabled={busy || !form.title.trim()} className="gap-1.5">
              {busy ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
              {isNew ? 'Create post' : 'Save changes'}
            </Button>
          )}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <BlogLivePreview form={form} activeSection={activeSection} />
        </div>
      </form>
    </div>
  )
}

function Field({ section, label, help, activeSection, onFocus, children }) {
  const active = activeSection === section
  return (
    <div
      className={`space-y-2 rounded-lg border p-4 transition-colors ${
        active ? 'border-primary bg-primary/5' : 'border-transparent'
      }`}
      onFocusCapture={() => onFocus(section)}
    >
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{help}</p>
      {children}
    </div>
  )
}
