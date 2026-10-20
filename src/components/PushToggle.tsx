// Turn on notifications. iOS only offers Web Push to a home-screen app, and
// only asks permission from a tap, so this is a button, not a prompt on load.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, client, keys } from '~/lib/api'

type Status = 'unsupported' | 'needs-install' | 'off' | 'on' | 'denied' | 'unconfigured'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

async function subscribe(pushKey: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushKey),
    }))
  await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify(subscription.toJSON()) })
}

export function PushToggle() {
  const { data: auth } = useQuery({ queryKey: keys.auth, queryFn: client.authStatus })
  const [status, setStatus] = useState<Status>('off')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    if (!auth.pushKey) return setStatus('unconfigured')
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return setStatus(/iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? 'needs-install' : 'unsupported')
    }
    if (Notification.permission === 'denied') return setStatus('denied')
    if (Notification.permission === 'granted') {
      // Re-register every launch: iOS sometimes drops a subscription.
      void subscribe(auth.pushKey).then(
        () => setStatus('on'),
        () => setStatus('off'),
      )
    }
  }, [auth])

  if (status === 'unconfigured' || status === 'unsupported') return null
  if (status === 'needs-install') {
    return <p className="hint">Add Ravens to your Home Screen (Share › Add to Home Screen) to get notifications.</p>
  }
  if (status === 'denied') return <p className="hint">Notifications are off for Ravens in Settings.</p>
  if (status === 'on') return null

  return (
    <div className="push-toggle">
      <button
        type="button"
        className="btn primary"
        onClick={async () => {
          setError(null)
          try {
            if ((await Notification.requestPermission()) !== 'granted') return setStatus('denied')
            await subscribe(auth!.pushKey!)
            setStatus('on')
          } catch (err) {
            setError((err as Error).message)
          }
        }}
      >
        Turn on notifications
      </button>
      {error && (
        <p className="card-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
