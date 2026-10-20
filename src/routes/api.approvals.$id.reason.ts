import { createFileRoute } from '@tanstack/react-router'
import { proxied, readJson } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'

export const Route = createFileRoute('/api/approvals/$id/reason')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { text } = await readJson<{ text?: string }>(request)
        return proxied(() => nanoclaw.reason(params.id, text ?? ''), 202)
      },
    },
  },
})
