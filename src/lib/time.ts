export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ''
  const then = Date.parse(iso.includes('T') || iso.endsWith('Z') ? iso : `${iso.replace(' ', 'T')}Z`)
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
