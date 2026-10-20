import { describe, expect, it } from 'vitest'
import { frame, SseParser } from '~/server/sse'

describe('SseParser', () => {
  it('assembles events across chunk boundaries', () => {
    const p = new SseParser()
    expect(p.push('id: 3\nevent: mess')).toEqual([])
    expect(p.push('age\ndata: {"a":1}\n')).toEqual([])
    expect(p.push('\n')).toEqual([{ event: 'message', data: '{"a":1}', id: '3' }])
  })

  it('skips comments, joins multi-line data, handles CRLF', () => {
    const p = new SseParser()
    expect(p.push(': ping\r\n\r\nevent: card\r\ndata: a\r\ndata: b\r\n\r\n')).toEqual([{ event: 'card', data: 'a\nb' }])
  })

  it('round-trips frame()', () => {
    const p = new SseParser()
    expect(p.push(frame('typing', { x: 'y' }, '9'))).toEqual([{ event: 'typing', data: '{"x":"y"}', id: '9' }])
  })
})
