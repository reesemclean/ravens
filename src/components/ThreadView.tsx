// One conversation with a raven, on assistant-ui's external-store runtime:
// the messages are ours (history from NanoClaw, plus sends not yet in it),
// assistant-ui renders them and the composer.
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'
import { client, keys } from '~/lib/api'
import { threadKey, TYPING_FRESH_MS, useLive } from '~/lib/live'
import type { HistoryMessage } from '~/lib/types'
import { ApprovalCard } from './ApprovalCard'
import { useVisibleCards } from './useVisibleCards'

interface Outgoing {
  id: string
  text: string
  at: number
}

// A send stays "on its way" until history has it, or two minutes pass.
const OUTGOING_MS = 120_000

function toLike(m: HistoryMessage): ThreadMessageLike {
  const text = m.text ?? (m.card ? `**${m.card.title}**${m.card.question ? `\n\n${m.card.question}` : ''}` : '')
  return {
    id: m.id,
    role: m.direction === 'in' ? 'user' : 'assistant',
    content: [{ type: 'text', text }],
    createdAt: new Date(m.timestamp),
  }
}

function textOf(message: AppendMessage): string {
  return message.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

const Markdown = () => <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="markdown" />

function UserMessage() {
  return (
    <MessagePrimitive.Root className="msg user">
      <MessagePrimitive.Parts components={{ Text: Markdown }} />
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="msg assistant">
      <MessagePrimitive.Parts components={{ Text: Markdown }} />
    </MessagePrimitive.Root>
  )
}

export function ThreadView({ folder, threadId }: { folder: string; threadId: string }) {
  const queryClient = useQueryClient()
  const { data: history = [], isLoading } = useQuery({
    queryKey: keys.messages(folder, threadId),
    queryFn: () => client.messages(folder, threadId),
  })
  const { data: pending } = useQuery({ queryKey: keys.pending, queryFn: client.pending })
  const cards = useVisibleCards(pending).filter((c) => c.folder === folder && c.threadId === threadId)
  const typingAt = useLive((s) => s.typing[threadKey(folder, threadId)] ?? 0)
  const [outgoing, setOutgoing] = useState<Outgoing[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2_000)
    return () => clearInterval(timer)
  }, [])

  // Drop a send once history holds an inbound message with its text.
  const inboundTexts = useMemo(
    () => new Set(history.filter((m) => m.direction === 'in').map((m) => m.text?.trim())),
    [history],
  )
  const stillOutgoing = outgoing.filter((o) => !inboundTexts.has(o.text) && now - o.at < OUTGOING_MS)

  const messages = useMemo<ThreadMessageLike[]>(
    () => [
      ...history.map(toLike),
      ...stillOutgoing.map((o) => ({
        id: o.id,
        role: 'user' as const,
        content: [{ type: 'text' as const, text: o.text }],
        createdAt: new Date(o.at),
      })),
    ],
    [history, stillOutgoing],
  )

  const lastIsInbound = history.at(-1)?.direction === 'in'
  const waiting = stillOutgoing.length > 0 || (lastIsInbound && now - Date.parse(history.at(-1)!.timestamp) < OUTGOING_MS)
  const isRunning = now - typingAt < TYPING_FRESH_MS || waiting

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (m) => m,
    isRunning,
    onNew: async (message) => {
      const text = textOf(message)
      if (!text) return
      setSendError(null)
      const id = `local-${crypto.randomUUID()}`
      setOutgoing((list) => [...list, { id, text, at: Date.now() }])
      try {
        await client.send(folder, threadId, text)
        void queryClient.invalidateQueries({ queryKey: keys.threads(folder) })
      } catch (err) {
        setOutgoing((list) => list.filter((o) => o.id !== id))
        setSendError((err as Error).message)
      }
    },
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="thread">
        <ThreadPrimitive.Viewport className="thread-viewport" autoScroll>
          {!isLoading && messages.length === 0 && <p className="empty">New thread. Say what you need.</p>}
          <ThreadPrimitive.Messages>
            {({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
          </ThreadPrimitive.Messages>
          {isRunning && (
            <p className="typing" aria-live="polite">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Working
            </p>
          )}
          {cards.length > 0 && (
            <div className="thread-cards">
              {cards.map((card) => (
                <ApprovalCard key={card.questionId} card={card} />
              ))}
            </div>
          )}
        </ThreadPrimitive.Viewport>
        {sendError && (
          <p className="card-error composer-error" role="alert">
            {sendError}
          </p>
        )}
        <ComposerPrimitive.Root className="composer">
          <ComposerPrimitive.Input className="composer-input" placeholder="Message" rows={1} aria-label="Message" />
          <ComposerPrimitive.Send className="btn primary composer-send">Send</ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}
