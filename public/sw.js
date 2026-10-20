// Ravens service worker: push notifications only. No caching — the app is
// live data behind a sign-in, and a stale shell would only get in the way.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Ravens', body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Ravens'
  const work = [
    self.registration.showNotification(title, {
      body: payload.body || '',
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  ]
  if (typeof payload.badge === 'number' && navigator.setAppBadge) work.push(navigator.setAppBadge(payload.badge))
  event.waitUntil(Promise.all(work))
})

// iOS shows no action buttons on web notifications: a tap opens the card.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
