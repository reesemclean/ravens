// Shapes shared by the server and the UI. The NanoClaw ones mirror the web
// channel's API (reesemclean/nanoclaw, .claude/skills/add-web).

export interface Agent {
  agentGroupId: string
  folder: string
  name: string
  platformId: string
  lastActive: string | null
}

export interface Thread {
  threadId: string
  sessionId: string
  status: 'active' | 'closed'
  containerStatus: 'running' | 'idle' | 'stopped'
  lastActive: string | null
  createdAt: string
  /** Ravens' own title: the thread's first message. */
  title: string | null
  /** Archived in Ravens: hidden from the thread list until unarchived. */
  archived: boolean
}

export interface HistoryMessage {
  id: string
  direction: 'in' | 'out'
  timestamp: string
  text?: string
  card?: { questionId: string; title: string; question: string; options: Array<{ label: string }> }
}

export interface CardOption {
  label: string
  selectedLabel: string
  style?: string
}

export interface Card {
  questionId: string
  kind: 'approval' | 'question'
  folder: string | null
  threadId: string | null
  title: string
  question: string
  options: CardOption[]
  status?: 'pending' | 'awaiting_reason'
  deferred: boolean
  expiresAt?: string | null
  createdAt?: string
}

export type NanoclawEvent =
  | { type: 'message'; folder: string | null; threadId: string | null; id: string; text: string; timestamp: string }
  | ({ type: 'card' } & Card)
  | { type: 'card.pending'; questionId: string }
  | { type: 'card.awaiting_reason'; questionId: string }
  | { type: 'card.resolved'; questionId: string; resolution: string }
  | { type: 'typing'; folder: string | null; threadId: string | null; status?: string }

/** What the browser's event stream carries: NanoClaw's events, plus Ravens' own. */
export type AppEvent = NanoclawEvent | { type: 'resync' } | { type: 'ready' }
