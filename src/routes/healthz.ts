import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/server/db'
import { relayStatus } from '~/server/relay'

// Gatus checks this. The process is healthy if SQLite answers; whether the
// NanoClaw stream is up is reported, not failed on, so a NanoClaw restart
// doesn't read as Ravens being down.
export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: async () => {
        db().prepare('SELECT 1').get()
        return Response.json({ ok: true, nanoclaw: relayStatus().connected })
      },
    },
  },
})
