import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // The live stream invalidates what changed; no polling on top of it.
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  })
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
