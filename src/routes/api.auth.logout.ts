import { createFileRoute } from '@tanstack/react-router'
import { clearedSessionCookie, endSession, readCookie, SESSION_COOKIE } from '~/server/auth'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        endSession(readCookie(request, SESSION_COOKIE))
        return Response.json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie() } })
      },
    },
  },
})
