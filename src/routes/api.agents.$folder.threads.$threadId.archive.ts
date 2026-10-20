import { createFileRoute } from '@tanstack/react-router'
import { readJson } from '~/server/http'
import { setArchived } from '~/server/threads'

// The same shape NanoClaw's web channel accepts.
const THREAD_ID = /^t_[A-Za-z0-9-]{8,64}$/

export const Route = createFileRoute('/api/agents/$folder/threads/$threadId/archive')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!THREAD_ID.test(params.threadId)) return Response.json({ error: 'Invalid threadId.' }, { status: 400 })
        const { archived } = await readJson<{ archived?: unknown }>(request)
        if (typeof archived !== 'boolean') return Response.json({ error: 'archived must be true or false.' }, { status: 400 })
        setArchived(params.folder, params.threadId, archived)
        return Response.json({ archived })
      },
    },
  },
})
