// Web Push to every subscribed device. iOS shows each push as a notification
// (no silent pushes, no action buttons), so a push always carries a title and
// the deep link the tap opens.
import webpush from 'web-push'
import { settings } from './config'
import { db } from './db'

export interface PushPayload {
  title: string
  body: string
  /** Opened when the notification is tapped. */
  url: string
  /** Replaces an earlier notification with the same tag. */
  tag?: string
  badge?: number
}

export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function isPushConfigured(): boolean {
  return settings.vapid !== null
}

export function saveSubscription(sub: PushSubscriptionJSON): void {
  db()
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, Date.now())
}

export function deleteSubscription(endpoint: string): void {
  db().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
}

export async function pushAll(payload: PushPayload): Promise<void> {
  const vapid = settings.vapid
  if (!vapid) return
  const subs = db().prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all() as Array<{
    endpoint: string
    p256dh: string
    auth: string
  }>
  const body = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          vapidDetails: vapid,
          TTL: 24 * 60 * 60,
          urgency: 'high',
        })
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // Gone: the device unsubscribed or the app was removed.
        if (status === 404 || status === 410) deleteSubscription(s.endpoint)
        else console.warn('push failed', status ?? err)
      }
    }),
  )
}
