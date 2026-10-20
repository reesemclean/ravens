import { createFileRoute } from '@tanstack/react-router'
import { loginOptions } from '~/server/auth'

export const Route = createFileRoute('/api/auth/login/options')({
  server: {
    handlers: {
      POST: async () => Response.json(await loginOptions()),
    },
  },
})
