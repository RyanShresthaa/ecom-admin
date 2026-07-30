/**
 * Contact form embeds Name/Email/Phone/Address at the end of `comment`.
 * Account-linked feedback may also have user_name from the users join.
 */
export function parseFeedbackComment(comment = '', title = '') {
  const raw = String(comment || '')
  const lines = raw.split(/\r?\n/)
  const metaLine = /^(Name|Email|Phone|Address):\s*(.*)$/i
  const meta = {}

  let i = lines.length - 1
  while (i >= 0 && !lines[i].trim()) i -= 1

  while (i >= 0) {
    const match = lines[i].trim().match(metaLine)
    if (!match) break
    meta[match[1].toLowerCase()] = match[2].trim()
    i -= 1
  }

  while (i >= 0 && !lines[i].trim()) i -= 1

  const collectedMeta = Object.keys(meta).length > 0
  const message = collectedMeta
    ? lines.slice(0, i + 1).join('\n').trim()
    : raw.trim()

  let nameFromTitle = ''
  const titleMatch = String(title || '').match(/^Contact from\s+(.+)$/i)
  if (titleMatch) nameFromTitle = titleMatch[1].trim()

  return {
    message: message || raw.trim(),
    name: meta.name || nameFromTitle || '',
    email: meta.email || '',
    phone: meta.phone || '',
    address: meta.address || '',
    isContactForm: Boolean(collectedMeta || nameFromTitle),
  }
}

export function resolveFeedbackSender(row) {
  const accountName = String(row.user_name || row.userName || '').trim()
  const accountEmail = String(row.user_email || row.userEmail || '').trim()
  const parsed = parseFeedbackComment(row.comment || '', row.title || '')

  return {
    ...parsed,
    displayName: accountName || parsed.name || 'Guest',
    displayEmail: accountEmail || parsed.email || '',
    accountLinked: Boolean(accountName || accountEmail),
  }
}
