import { createFileRoute } from '@tanstack/react-router'
import { addClient } from '~/server/relay'

const PING_MS = 20_000

// The browser's live stream. It carries no replay: on `ready` (every
// connect) the app refetches, so a stream iOS dropped in the background
// costs nothing but a refetch.
export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const encoder = new TextEncoder()
        let cleanup = () => {}
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (chunk: string) => {
              try {
                controller.enqueue(encoder.encode(chunk))
              } catch {
                cleanup()
              }
            }
            const remove = addClient(send)
            const ping = setInterval(() => send(': ping\n\n'), PING_MS)
            cleanup = () => {
              clearInterval(ping)
              remove()
            }
            request.signal.addEventListener('abort', () => {
              cleanup()
              try {
                controller.close()
              } catch {
                // already closed
              }
            })
          },
          cancel() {
            cleanup()
          },
        })
        return new Response(stream, {
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-store',
            'x-accel-buffering': 'no',
          },
        })
      },
    },
  },
})
