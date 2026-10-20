import { createFileRoute } from '@tanstack/react-router'
import { proxied, readJson } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'
import { rememberTitle, setArchived } from '~/server/threads'

export const Route = createFileRoute('/api/messages')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { folder, threadId, text } = await readJson<{ folder?: string; threadId?: string; text?: string }>(
          request,
        )
        if (!folder || !threadId || !text?.trim()) {
          return Response.json({ error: 'folder, threadId and text are required.' }, { status: 400 })
        }
        return proxied(async () => {
          const sent = await nanoclaw.send(folder, threadId, text)
          rememberTitle(folder, threadId, text)
          setArchived(folder, threadId, false)
          return sent
        }, 202)
      },
    },
  },
})
