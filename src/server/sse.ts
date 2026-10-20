// A Server-Sent Events parser for the stream from NanoClaw: feed it text
// chunks as they arrive, get back whole events. Comments (`: ping`) are
// dropped; multi-line data is joined with \n, as the spec says.

export interface SseEvent {
  event: string
  data: string
  id?: string
}

export class SseParser {
  private buffer = ''
  private event = ''
  private data: string[] = []
  private id: string | undefined

  push(chunk: string): SseEvent[] {
    this.buffer += chunk
    const out: SseEvent[] = []
    let newline: number
    while ((newline = this.buffer.search(/\r\n|\n|\r/)) >= 0) {
      const line = this.buffer.slice(0, newline)
      const width = this.buffer.startsWith('\r\n', newline) ? 2 : 1
      this.buffer = this.buffer.slice(newline + width)
      if (line === '') {
        if (this.data.length > 0) {
          out.push({ event: this.event || 'message', data: this.data.join('\n'), ...(this.id && { id: this.id }) })
        }
        this.event = ''
        this.data = []
        this.id = undefined
        continue
      }
      if (line.startsWith(':')) continue
      const colon = line.indexOf(':')
      const field = colon < 0 ? line : line.slice(0, colon)
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
      if (field === 'event') this.event = value
      else if (field === 'data') this.data.push(value)
      else if (field === 'id') this.id = value
    }
    return out
  }
}

export function frame(event: string, data: unknown, id?: string): string {
  return `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}
