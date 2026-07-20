import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'a',
  'img',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'src', 'alt']

export function isHtmlContent(text) {
  return /<[a-z][\s\S]*>/i.test(String(text || ''))
}

export function sanitizeBlogHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

export function renderBlogBody(html) {
  if (!html) return null
  if (!isHtmlContent(html)) {
    return String(html)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => <p key={i}>{p}</p>)
  }
  return (
    <div
      className="blog-rich"
      dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(html) }}
    />
  )
}
