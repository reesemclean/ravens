import { createFileRoute } from '@tanstack/react-router'
import { proxied } from '~/server/http'
import { threadsWithTitles } from '~/server/threads'

export const Route = createFileRoute('/api/agents/$folder/threads/')({
  server: {
    handlers: {
      GET: ({ params }) => proxied(async () => ({ threads: await threadsWithTitles(params.folder) })),
    },
  },
})
