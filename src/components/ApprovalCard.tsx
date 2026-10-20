// An approval or question card, with the same rules as NanoClaw's Telegram
// cards: a click resolves it at once, except a gateway approval, which waits
// for the gateway to confirm; "Reject with reason…" asks for the reason here
// (NanoClaw gives it five minutes).
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client, keys } from '~/lib/api'
import { setCardState, useLive, type CardState } from '~/lib/live'
import type { Card } from '~/lib/types'

const REASON_CHARS = 280

export function ApprovalCard({ card, ravenName, highlight }: { card: Card; ravenName?: string; highlight?: boolean }) {
  const queryClient = useQueryClient()
  const live = useLive((s): CardState | undefined => s.cards[card.questionId])
  const phase = live?.phase ?? (card.status === 'awaiting_reason' ? 'awaiting_reason' : 'open')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const act = useMutation({
    mutationFn: (option: number) => client.act(card.questionId, option),
    onMutate: () => setError(null),
    onSuccess: (result) => {
      if (result.awaitingReason) setCardState(card.questionId, { phase: 'awaiting_reason' })
      else if (result.deferred) setCardState(card.questionId, { phase: 'deferred' })
    },
    onError: (err) => setError((err as Error).message),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.pending }),
  })

  const sendReason = useMutation({
    mutationFn: (text: string) => client.reason(card.questionId, text),
    onMutate: () => setError(null),
    onError: (err) => setError((err as Error).message),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.pending }),
  })

  const busy = act.isPending || sendReason.isPending
  const kindLabel = card.kind === 'approval' ? 'Needs your OK' : 'Question'

  return (
    <article
      id={card.questionId}
      className={`card ${card.kind}${highlight ? ' highlight' : ''}${phase === 'resolved' ? ' resolved' : ''}`}
      aria-label={card.title}
    >
      <p className="card-meta">
        {ravenName && <strong>{ravenName}</strong>}
        <span>{kindLabel}</span>
      </p>
      <h3 className="card-title">{card.title}</h3>
      {card.question && <p className="card-question">{card.question}</p>}

      {phase === 'resolved' && live?.phase === 'resolved' && <p className="card-resolution">{live.resolution}</p>}

      {phase === 'deferred' && <p className="card-waiting">Sent. Waiting for the gateway to confirm…</p>}

      {phase === 'open' && (
        <div className="card-actions">
          {card.options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={`btn ${option.style === 'danger' ? 'danger' : option.style === 'primary' ? 'primary' : ''}`}
              disabled={busy}
              onClick={() => act.mutate(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {phase === 'awaiting_reason' && (
        <form
          className="card-reason"
          onSubmit={(e) => {
            e.preventDefault()
            sendReason.mutate(reason.trim())
          }}
        >
          <label htmlFor={`reason-${card.questionId}`}>Why? The raven will see this.</label>
          <textarea
            id={`reason-${card.questionId}`}
            value={reason}
            maxLength={REASON_CHARS}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <div className="card-actions">
            <button type="submit" className="btn danger" disabled={busy}>
              Reject
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => sendReason.mutate('')}>
              Reject without a reason
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="card-error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
