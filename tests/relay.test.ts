import { describe, expect, it } from 'vitest'
import { pushFor } from '~/server/relay'

const nameOf = async (folder: string | null) => (folder === 'odin' ? 'Odin' : 'Ravens')
const card = {
  type: 'card' as const,
  questionId: 'appr-1',
  kind: 'approval' as const,
  folder: 'odin',
  threadId: 't_x',
  title: 'Install packages',
  question: 'jq',
  options: [],
  deferred: false,
}

describe('pushFor', () => {
  it('always pushes a new card, deep-linked to it', async () => {
    expect(await pushFor(card, true, nameOf)).toEqual({
      title: 'Odin needs your OK',
      body: 'Install packages: jq',
      url: '/needs-you#appr-1',
      tag: 'appr-1',
    })
    expect((await pushFor({ ...card, kind: 'question' }, false, nameOf))?.title).toBe('Odin has a question')
  })

  it('pushes a reply only when no browser is open', async () => {
    const message = {
      type: 'message' as const,
      folder: 'odin',
      threadId: 't_x',
      id: 'm',
      text: 'done',
      timestamp: '',
    }
    expect(await pushFor(message, true, nameOf)).toBeNull()
    expect(await pushFor(message, false, nameOf)).toEqual({ title: 'Odin', body: 'done', url: '/r/odin/t/t_x', tag: 't_x' })
  })

  it('ignores typing and resolutions', async () => {
    expect(await pushFor({ type: 'typing', folder: 'odin', threadId: 't_x' }, false, nameOf)).toBeNull()
    expect(await pushFor({ type: 'card.resolved', questionId: 'q', resolution: 'ok' }, false, nameOf)).toBeNull()
  })
})
