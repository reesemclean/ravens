/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouterState } from '@tanstack/react-router'
import { TabBar } from '~/components/TabBar'
import { useLiveEvents } from '~/lib/live'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#f6f4ef', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#15161a', media: '(prefers-color-scheme: dark)' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Ravens' },
      { title: 'Ravens' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'icon', href: '/icons/icon-192.png', type: 'image/png' },
    ],
  }),
  component: RootComponent,
})

const SIGNED_OUT_PAGES = ['/login', '/enroll']

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const signedOutPage = SIGNED_OUT_PAGES.includes(pathname)
  const inThread = /^\/r\/[^/]+\/t\//.test(pathname)

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return (
    <Document>
      <QueryClientProvider client={queryClient}>
        {signedOutPage ? <Outlet /> : <SignedIn queryClient={queryClient} showTabs={!inThread} />}
      </QueryClientProvider>
    </Document>
  )
}

function SignedIn({ queryClient, showTabs }: { queryClient: QueryClient; showTabs: boolean }) {
  useLiveEvents(queryClient)
  return (
    <div className={showTabs ? 'app with-tabs' : 'app'}>
      <Outlet />
      {showTabs && <TabBar />}
    </div>
  )
}

function Document({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
