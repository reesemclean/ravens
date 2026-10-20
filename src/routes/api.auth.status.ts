import { createFileRoute } from '@tanstack/react-router'
import { credentialCount, isSignedIn } from '~/server/auth'
import { settings } from '~/server/config'

export const Route = createFileRoute('/api/auth/status')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        Response.json({
          signedIn: isSignedIn(request),
          enrolled: credentialCount() > 0,
          pushKey: settings.vapid?.publicKey ?? null,
        }),
    },
  },
})
