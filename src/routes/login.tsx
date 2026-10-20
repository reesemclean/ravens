import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { startAuthentication } from '@simplewebauthn/browser'
import { api } from '~/lib/api'

export const Route = createFileRoute('/login')({ component: Login })

function safeNext(): string {
  const next = new URLSearchParams(location.search).get('next') || '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function Login() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <main className="page auth">
      <h1>Ravens</h1>
      <button
        type="button"
        className="btn primary wide"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            const { options, challengeId } = await api<{ options: never; challengeId: string }>(
              '/api/auth/login/options',
              { method: 'POST', body: '{}' },
            )
            const response = await startAuthentication({ optionsJSON: options })
            await api('/api/auth/login/verify', { method: 'POST', body: JSON.stringify({ challengeId, response }) })
            location.assign(safeNext())
          } catch (err) {
            setError((err as Error).name === 'NotAllowedError' ? 'Sign-in was cancelled.' : (err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        Sign in with passkey
      </button>
      {error && (
        <p className="card-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
