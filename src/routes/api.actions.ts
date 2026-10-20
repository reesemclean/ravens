import { createFileRoute } from '@tanstack/react-router'
import { proxied, readJson } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'

export const Route = createFileRoute('/api/actions')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { questionId, option } = await readJson<{ questionId?: string; option?: number }>(request)
        if (!questionId || typeof option !== 'number') {
          return Response.json({ error: 'questionId and option are required.' }, { status: 400 })
        }
        return proxied(() => nanoclaw.act(questionId, option), 202)
      },
    },
  },
})
