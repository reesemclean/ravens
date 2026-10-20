// Browser-side API calls. A 401 means the session ended: go sign in.
import type { Agent, Card, HistoryMessage, Thread } from './types'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    const next = location.pathname + location.search + location.hash
    location.assign(`/login?next=${encodeURIComponent(next)}`)
  }
  if (!res.ok) throw new ApiError(res.status, body.error || `Request failed (${res.status})`)
  return body
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

export const keys = {
  agents: ['agents'] as const,
  threads: (folder: string) => ['threads', folder] as const,
  messages: (folder: string, threadId: string) => ['messages', folder, threadId] as const,
  pending: ['pending'] as const,
  auth: ['auth'] as const,
}

export const client = {
  agents: () => api<{ agents: Agent[] }>('/api/agents').then((r) => r.agents),
  threads: (folder: string) =>
    api<{ threads: Thread[] }>(`/api/agents/${encodeURIComponent(folder)}/threads`).then((r) => r.threads),
  messages: (folder: string, threadId: string) =>
    api<{ messages: HistoryMessage[] }>(
      `/api/agents/${encodeURIComponent(folder)}/threads/${encodeURIComponent(threadId)}/messages`,
    ).then((r) => r.messages),
  pending: () => api<{ cards: Card[] }>('/api/pending').then((r) => r.cards),
  archive: (folder: string, threadId: string, archived: boolean) =>
    api<{ archived: boolean }>(
      `/api/agents/${encodeURIComponent(folder)}/threads/${encodeURIComponent(threadId)}/archive`,
      post({ archived }),
    ),
  send: (folder: string, threadId: string, text: string) =>
    api<{ id: string }>('/api/messages', post({ folder, threadId, text })),
  act: (questionId: string, option: number) =>
    api<{ deferred: boolean; awaitingReason?: boolean }>('/api/actions', post({ questionId, option })),
  reason: (approvalId: string, text: string) =>
    api<object>(`/api/approvals/${encodeURIComponent(approvalId)}/reason`, post({ text })),
  authStatus: () => api<{ signedIn: boolean; enrolled: boolean; pushKey: string | null }>('/api/auth/status'),
}

export function newThreadId(): string {
  return `t_${crypto.randomUUID()}`
}
