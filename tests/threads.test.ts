import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDb, setDb } from '~/server/db'
import { annotate, rememberTitle, setArchived, titleFrom } from '~/server/threads'
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

describe('archiving', () => {
  beforeEach(() => setDb(openDb(':memory:')))
  afterEach(() => setDb(null))

  const thread = (threadId: string) => ({
    threadId,
    sessionId: `s-${threadId}`,
    status: 'active' as const,
    containerStatus: 'idle' as const,
    lastActive: null,
    createdAt: '2026-10-19T00:00:00Z',
  })

  it('marks archived threads, including ones without a title, and reopens them', () => {
    rememberTitle('odin', 't_aaaaaaaa', 'Tell me what you do.')
    setArchived('odin', 't_aaaaaaaa', true)
    setArchived('odin', 't_bbbbbbbb', true)
    setArchived('odin', 't_bbbbbbbb', true)
    expect(annotate('odin', [thread('t_aaaaaaaa'), thread('t_bbbbbbbb'), thread('t_cccccccc')])).toMatchObject([
      { threadId: 't_aaaaaaaa', title: 'Tell me what you do.', archived: true },
      { threadId: 't_bbbbbbbb', title: null, archived: true },
      { threadId: 't_cccccccc', archived: false },
    ])
    setArchived('odin', 't_aaaaaaaa', false)
    expect(annotate('odin', [thread('t_aaaaaaaa')])[0]!.archived).toBe(false)
  })

  it('keeps each raven separate', () => {
    setArchived('odin', 't_aaaaaaaa', true)
    expect(annotate('other', [thread('t_aaaaaaaa')])[0]!.archived).toBe(false)
  })
})
