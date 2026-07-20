/**
 * Normalize pasted image URLs (Google Drive share links, etc.) into something
 * an <img> tag can load. Returns null when the URL is clearly not a direct image.
 */
export function normalizeImageUrl(raw) {
  const input = String(raw || '').trim()
  if (!input) return ''

  // Google Drive: /file/d/ID/view or open?id=ID
  const driveFile = input.match(/drive\.google\.com\/file\/d\/([^/]+)/i)
  if (driveFile?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`
  }
  const driveOpen = input.match(/drive\.google\.com\/(?:open|uc)\?[^#]*[?&]?id=([^&]+)/i)
  if (driveOpen?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`
  }

  // Google Images result page — not a direct image
  if (/google\.[^/]+\/imgres/i.test(input) || /google\.[^/]+\/search\?/i.test(input)) {
    return null
  }

  return input
}

export function isLikelyDirectImageUrl(url) {
  if (!url) return false
  if (url.startsWith('data:image/')) return true
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) {
    // Reject Google search / imgres pages
    if (/google\.[^/]+\/(imgres|search)/i.test(url)) return false
    return true
  }
  return false
}
