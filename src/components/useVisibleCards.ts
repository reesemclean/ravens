// Pending cards, plus the ones that resolved in the last minute: the pending
// list drops a card the moment it resolves, but the resolution ("✅ Approved
// by Reese") should stay on screen long enough to read.
import { useEffect, useRef, useState } from 'react'
import { useLive } from '~/lib/live'
import type { Card } from '~/lib/types'

const KEEP_MS = 60_000

export function useVisibleCards(pending: Card[] | undefined): Card[] {
  const seen = useRef(new Map<string, { card: Card; resolvedAt?: number }>())
  const cards = useLive((s) => s.cards)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])

  const pendingIds = new Set((pending ?? []).map((c) => c.questionId))
  for (const card of pending ?? []) seen.current.set(card.questionId, { card })
  for (const [id, entry] of seen.current) {
    if (pendingIds.has(id)) continue
    if (cards[id]?.phase !== 'resolved') {
      seen.current.delete(id)
      continue
    }
    entry.resolvedAt ??= now
    if (now - entry.resolvedAt > KEEP_MS) seen.current.delete(id)
  }
  return [...seen.current.values()].map((e) => e.card)
}
