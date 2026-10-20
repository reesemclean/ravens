import { createFileRoute } from '@tanstack/react-router'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createSession, sessionCookie, verifyLogin } from '~/server/auth'
import { readJson } from '~/server/http'

export const Route = createFileRoute('/api/auth/login/verify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson<{ challengeId?: string; response?: AuthenticationResponseJSON }>(request)
        if (!body.challengeId || !body.response) return Response.json({ error: 'Incomplete request.' }, { status: 400 })
        try {
          const credentialId = await verifyLogin(body.challengeId, body.response)
          return Response.json({ ok: true }, { headers: { 'set-cookie': sessionCookie(createSession(credentialId)) } })
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 401 })
        }
      },
    },
  },
})
