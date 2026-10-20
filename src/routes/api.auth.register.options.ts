import { createFileRoute } from '@tanstack/react-router'
import { enrollRefusal, registrationOptions } from '~/server/auth'
import { readJson } from '~/server/http'

export const Route = createFileRoute('/api/auth/register/options')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { code } = await readJson<{ code?: string }>(request)
        const refusal = enrollRefusal(code)
        if (refusal) return Response.json({ error: refusal }, { status: 403 })
        return Response.json(await registrationOptions())
      },
    },
  },
})
