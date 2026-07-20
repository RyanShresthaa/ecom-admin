import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { isHtmlContent } from '@/lib/blogContent'
import { normalizeImageUrl } from '@/lib/imageUrl'

const SECTION_LABELS = {
  title: 'Headline',
  excerpt: 'Short summary',
  cover: 'Cover image',
  body: 'Article text',
  publish: 'Publish switch',
}

function PreviewBlock({ section, activeSection, label, children, className }) {
  const active = activeSection === section
  return (
    <div
      data-section={section}
      className={cn(
        'relative rounded-lg border border-dashed border-slate-200 bg-white p-4 transition-all duration-200',
        active && 'border-primary ring-2 ring-primary/30 shadow-md',
        className
      )}
    >
      {active ? (
        <span className="absolute -top-2.5 left-3 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Editing: {label}
        </span>
      ) : (
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

function Block({ className, children, ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

function formatBody(text) {
  if (!text) return null
  if (isHtmlContent(text)) {
    return (
      <div
        className="blog-rich prose prose-sm max-w-none text-slate-600 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }
  const parts = String(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length) return null
  return parts.map((p, i) => (
    <p key={i} className="text-sm leading-relaxed text-slate-600">
      {p}
    </p>
  ))
}

export function BlogLivePreview({ form, activeSection }) {
  const title = form.title?.trim() || 'Your post title'
  const excerpt = form.excerpt?.trim() || 'A short teaser shown on the blog list page.'
  const rawCover = form.coverImage?.trim()
  const cover = normalizeImageUrl(rawCover) || ''
  const body = form.body?.trim()
  const [coverBroken, setCoverBroken] = useState(false)

  useEffect(() => {
    setCoverBroken(false)
  }, [cover])

  return (
    <Block className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Live preview — click a field on the left to see which part you are editing.
      </p>
      <article className="overflow-hidden rounded-xl border bg-slate-50/80 shadow-sm">
        <PreviewBlock section="cover" activeSection={activeSection} label={SECTION_LABELS.cover}>
          {cover && !coverBroken ? (
            <img
              src={cover}
              alt=""
              className="h-40 w-full rounded-md object-cover"
              onError={() => setCoverBroken(true)}
            />
          ) : (
            <Block className="flex h-40 items-center justify-center rounded-md bg-slate-200/60 px-4 text-center text-xs text-slate-500">
              {coverBroken
                ? 'Image link failed to load — use Upload or a direct image URL'
                : 'Cover image area'}
            </Block>
          )}
        </PreviewBlock>

        <Block className="space-y-4 p-5">
          <PreviewBlock section="title" activeSection={activeSection} label={SECTION_LABELS.title}>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          </PreviewBlock>

          <PreviewBlock section="excerpt" activeSection={activeSection} label={SECTION_LABELS.excerpt}>
            <p className="text-sm text-slate-500">{excerpt}</p>
          </PreviewBlock>

          <PreviewBlock section="body" activeSection={activeSection} label={SECTION_LABELS.body}>
            {body ? (
              <Block className="space-y-3">{formatBody(body)}</Block>
            ) : (
              <Block className="space-y-2">
                <Block className="h-3 w-full rounded bg-slate-200/80" />
                <Block className="h-3 w-11/12 rounded bg-slate-200/60" />
                <Block className="h-3 w-10/12 rounded bg-slate-200/50" />
                <Block className="h-3 w-full rounded bg-slate-200/40" />
              </Block>
            )}
          </PreviewBlock>

          <PreviewBlock section="publish" activeSection={activeSection} label={SECTION_LABELS.publish}>
            <Block className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                  form.published ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded-full bg-white shadow transition-transform',
                    form.published ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </span>
              {form.published ? 'Visible on the store blog' : 'Saved as draft — customers cannot see it'}
            </Block>
          </PreviewBlock>
        </Block>
      </article>
    </Block>
  )
}
