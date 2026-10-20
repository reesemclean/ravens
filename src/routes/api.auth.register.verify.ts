import { createFileRoute } from '@tanstack/react-router'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { createSession, enrollRefusal, sessionCookie, verifyRegistration } from '~/server/auth'
import { readJson } from '~/server/http'

export const Route = createFileRoute('/api/auth/register/verify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson<{ code?: string; challengeId?: string; response?: RegistrationResponseJSON }>(
          request,
        )
        const refusal = enrollRefusal(body.code)
        if (refusal) return Response.json({ error: refusal }, { status: 403 })
        if (!body.challengeId || !body.response) return Response.json({ error: 'Incomplete request.' }, { status: 400 })
        try {
          const credentialId = await verifyRegistration(body.challengeId, body.response)
          return Response.json({ ok: true }, { headers: { 'set-cookie': sessionCookie(createSession(credentialId)) } })
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 400 })
        }
      },
    },
  },
})
