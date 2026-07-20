/** True when content looks like HTML from the rich text editor. */
export function isHtmlContent(text) {
  return /<[a-z][\s\S]*>/i.test(String(text || ''))
}

/** Strip tags for plain-text previews (excerpt cards, etc.). */
export function htmlToPlainText(html) {
  if (!html) return ''
  if (!isHtmlContent(html)) return String(html)
  if (typeof document === 'undefined') {
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent?.trim() || ''
}
