import { createFileRoute } from '@tanstack/react-router'
import { proxied } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'

export const Route = createFileRoute('/api/agents/$folder/threads/$threadId/messages')({
  server: {
    handlers: {
      GET: ({ params }) =>
        proxied(async () => ({ messages: await nanoclaw.messages(params.folder, params.threadId) })),
    },
  },
})
