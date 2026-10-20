import { createFileRoute } from '@tanstack/react-router'
import { proxied } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'

export const Route = createFileRoute('/api/pending')({
  server: { handlers: { GET: () => proxied(async () => ({ cards: await nanoclaw.pending() })) } },
})
