// The NanoClaw web channel, server to server. The bearer token never reaches
// a browser: every browser request goes through Ravens' own session check.
import type { Agent, Card, HistoryMessage, Thread } from '~/lib/types'
import { settings } from './config'

export class NanoclawError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function nanoclawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${settings.nanoclawUrl}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${settings.nanoclawToken}` },
  })
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await nanoclawFetch(path, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new NanoclawError(res.status, body.error || `NanoClaw answered ${res.status}`)
  return body
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const nanoclaw = {
  agents: () => json<{ agents: Agent[] }>('/api/agents').then((r) => r.agents),
  threads: (folder: string) =>
    json<{ threads: Omit<Thread, 'title' | 'archived'>[] }>(`/api/agents/${encodeURIComponent(folder)}/threads`).then(
      (r) => r.threads,
    ),
  messages: (folder: string, threadId: string, limit = 200) =>
    json<{ messages: HistoryMessage[] }>(
      `/api/agents/${encodeURIComponent(folder)}/threads/${encodeURIComponent(threadId)}/messages?limit=${limit}`,
    ).then((r) => r.messages),
  pending: () => json<{ cards: Card[] }>('/api/pending').then((r) => r.cards),
  send: (folder: string, threadId: string, text: string) =>
    json<{ id: string }>('/api/messages', post({ folder, threadId, text })),
  act: (questionId: string, option: number) =>
    json<{ deferred: boolean; awaitingReason?: boolean }>('/api/actions', post({ questionId, option })),
  reason: (approvalId: string, text: string) =>
    json<object>(`/api/approvals/${encodeURIComponent(approvalId)}/reason`, post({ text })),
}
