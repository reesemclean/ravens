import { describe, expect, it } from 'vitest'
import { titleFrom } from '~/server/threads'
import { relativeTime } from '~/lib/time'

describe('titleFrom', () => {
  it('flattens and trims long first messages', () => {
    expect(titleFrom('  hello\n\nthere ')).toBe('hello there')
    const long = titleFrom('x'.repeat(200))
    expect(long.length).toBe(80)
    expect(long.endsWith('…')).toBe(true)
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-10-19T12:00:00Z')
  it('reads ISO and SQLite timestamps', () => {
    expect(relativeTime('2026-10-19T11:59:30Z', now)).toBe('just now')
    expect(relativeTime('2026-10-19 11:00:00', now)).toBe('1h ago')
    expect(relativeTime(null, now)).toBe('')
  })
})
