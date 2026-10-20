import { createFileRoute } from '@tanstack/react-router'
import { readJson } from '~/server/http'
import { deleteSubscription, isPushConfigured, saveSubscription, type PushSubscriptionJSON } from '~/server/push'

export const Route = createFileRoute('/api/push/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isPushConfigured()) return Response.json({ error: 'Push is not configured.' }, { status: 503 })
        const sub = await readJson<Partial<PushSubscriptionJSON>>(request)
        if (!sub.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
          return Response.json({ error: 'Not a push subscription.' }, { status: 400 })
        }
        saveSubscription(sub as PushSubscriptionJSON)
        return Response.json({ ok: true })
      },
      DELETE: async ({ request }) => {
        const { endpoint } = await readJson<{ endpoint?: string }>(request)
        if (endpoint) deleteSubscription(endpoint)
        return Response.json({ ok: true })
      },
    },
  },
})
