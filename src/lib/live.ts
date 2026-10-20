// The app's one live connection, and the small bits of state that only
// exist live: who is typing, and how a card resolved. Everything else is
// refetched through React Query when an event says it changed.
import { useEffect, useSyncExternalStore } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { keys } from './api'
import type { AppEvent } from './types'

export type CardState =
  | { phase: 'deferred' }
  | { phase: 'awaiting_reason' }
  | { phase: 'resolved'; resolution: string }

interface LiveState {
  connected: boolean
  /** `${folder}/${threadId}` → when typing was last seen. */
  typing: Record<string, number>
  cards: Record<string, CardState>
}

let state: LiveState = { connected: false, typing: {}, cards: {} }
const listeners = new Set<() => void>()

function set(update: (s: LiveState) => LiveState): void {
  state = update(state)
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useLive<T>(select: (s: LiveState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select({ connected: false, typing: {}, cards: {} }),
  )
}

export function setCardState(questionId: string, card: CardState): void {
  set((s) => ({ ...s, cards: { ...s.cards, [questionId]: card } }))
}

/** Typing is re-sent every few seconds while an agent works. */
export const TYPING_FRESH_MS = 10_000

export function threadKey(folder: string, threadId: string): string {
  return `${folder}/${threadId}`
}

export function apply(event: AppEvent, queryClient: QueryClient): void {
  switch (event.type) {
    case 'ready':
    case 'resync':
      void queryClient.invalidateQueries()
      return
    case 'message':
      if (event.folder && event.threadId) {
        const key = threadKey(event.folder, event.threadId)
        set((s) => {
          const typing = { ...s.typing }
          delete typing[key]
          return { ...s, typing }
        })
        void queryClient.invalidateQueries({ queryKey: keys.messages(event.folder, event.threadId) })
        void queryClient.invalidateQueries({ queryKey: keys.threads(event.folder) })
      }
      return
    case 'typing':
      if (event.folder && event.threadId) {
        const key = threadKey(event.folder, event.threadId)
        set((s) => ({ ...s, typing: { ...s.typing, [key]: Date.now() } }))
      }
      return
    case 'card':
      void queryClient.invalidateQueries({ queryKey: keys.pending })
      return
    case 'card.pending':
      setCardState(event.questionId, { phase: 'deferred' })
      return
    case 'card.awaiting_reason':
      setCardState(event.questionId, { phase: 'awaiting_reason' })
      void queryClient.invalidateQueries({ queryKey: keys.pending })
      return
    case 'card.resolved':
      setCardState(event.questionId, { phase: 'resolved', resolution: event.resolution })
      void queryClient.invalidateQueries({ queryKey: keys.pending })
      return
  }
}

const EVENT_TYPES = [
  'ready',
  'resync',
  'message',
  'typing',
  'card',
  'card.pending',
  'card.awaiting_reason',
  'card.resolved',
] as const

/** Keep one EventSource open while the page is visible. */
export function useLiveEvents(queryClient: QueryClient): void {
  useEffect(() => {
    let source: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let delay = 1_000

    const open = () => {
      source?.close()
      source = new EventSource('/api/events')
      for (const type of EVENT_TYPES) {
        source.addEventListener(type, (e) => {
          delay = 1_000
          try {
            apply(JSON.parse((e as MessageEvent<string>).data) as AppEvent, queryClient)
          } catch {
            // a malformed frame is skipped, not fatal
          }
        })
      }
      source.addEventListener('ready', () => set((s) => ({ ...s, connected: true })))
      source.onerror = () => {
        set((s) => ({ ...s, connected: false }))
        source?.close()
        source = null
        if (document.visibilityState !== 'visible') return
        retry = setTimeout(open, delay)
        delay = Math.min(delay * 2, 30_000)
      }
    }

    // iOS can resume a suspended page with an EventSource that reports OPEN
    // but never delivers again, so coming back always reconnects (and the
    // `ready` that follows refetches).
    const onVisibility = () => {
      if (retry) clearTimeout(retry)
      if (document.visibilityState === 'visible') open()
      else {
        source?.close()
        source = null
      }
    }

    open()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (retry) clearTimeout(retry)
      source?.close()
    }
  }, [queryClient])
}
