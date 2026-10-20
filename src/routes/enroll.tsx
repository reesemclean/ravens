import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { startRegistration } from '@simplewebauthn/browser'
import { api } from '~/lib/api'

// /enroll?code=… — the one-time link that adds the first passkey.
export const Route = createFileRoute('/enroll')({ component: Enroll })

function Enroll() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <main className="page auth">
      <h1>Set up Ravens</h1>
      <p>Create a passkey on this device. Face ID will unlock Ravens from now on.</p>
      <button
        type="button"
        className="btn primary wide"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          const code = new URLSearchParams(location.search).get('code') ?? ''
          try {
            const { options, challengeId } = await api<{ options: never; challengeId: string }>(
              '/api/auth/register/options',
              { method: 'POST', body: JSON.stringify({ code }) },
            )
            const response = await startRegistration({ optionsJSON: options })
            await api('/api/auth/register/verify', {
              method: 'POST',
              body: JSON.stringify({ code, challengeId, response }),
            })
            location.assign('/')
          } catch (err) {
            setError((err as Error).name === 'NotAllowedError' ? 'Passkey setup was cancelled.' : (err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        Create passkey
      </button>
      {error && (
        <p className="card-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
