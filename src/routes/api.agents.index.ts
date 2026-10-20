import { createFileRoute } from '@tanstack/react-router'
import { proxied } from '~/server/http'
import { nanoclaw } from '~/server/nanoclaw'

export const Route = createFileRoute('/api/agents/')({
  server: { handlers: { GET: () => proxied(async () => ({ agents: await nanoclaw.agents() })) } },
})
