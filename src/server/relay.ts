// One long-lived connection to NanoClaw's event stream, shared by every open
// browser and kept up with none open, because pushes have to flow while the
// phone's app is closed.
//
// Browsers don't get a replay: when one connects (or reconnects after iOS
// suspended it) it receives `ready` and refetches state, which is the source
// of truth. The relay itself resumes NanoClaw's stream by sequence id, and
// tells browsers to `resync` when NanoClaw says the gap was too large.
import type { AppEvent, NanoclawEvent } from '~/lib/types'
import { nanoclaw, nanoclawFetch } from './nanoclaw'
import { pushAll } from './push'
import { frame, SseParser } from './sse'

type Client = (chunk: string) => void

const clients = new Set<Client>()
let boot: string | null = null
let seq = 0
let running = false
let abort: AbortController | null = null
let connected = false
const agentNames = new Map<string, string>()

export function relayStatus() {
  return { connected, clients: clients.size, boot, seq }
}

export function addClient(send: Client): () => void {
  clients.add(send)
  send(frame('ready', { connected }))
  return () => clients.delete(send)
}

function broadcast(event: AppEvent): void {
  const chunk = frame(event.type, event)
  for (const send of clients) send(chunk)
}

async function agentName(folder: string | null): Promise<string> {
  if (!folder) return 'Ravens'
  if (!agentNames.has(folder)) {
    for (const agent of await nanoclaw.agents().catch(() => [])) agentNames.set(agent.folder, agent.name)
  }
  return agentNames.get(folder) ?? folder
}

const excerpt = (text: string, max = 140) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export function threadUrl(folder: string, threadId: string): string {
  return `/r/${encodeURIComponent(folder)}/t/${encodeURIComponent(threadId)}`
}

/** What to push for an event, if anything. Exported for tests. */
export async function pushFor(
  event: NanoclawEvent,
  browsersOpen: boolean,
  nameOf: (folder: string | null) => Promise<string> = agentName,
): Promise<Parameters<typeof pushAll>[0] | null> {
  if (event.type === 'card') {
    const who = await nameOf(event.folder)
    return {
      title: event.kind === 'approval' ? `${who} needs your OK` : `${who} has a question`,
      body: excerpt(event.question ? `${event.title}: ${event.question}` : event.title),
      url: `/needs-you#${encodeURIComponent(event.questionId)}`,
      tag: event.questionId,
    }
  }
  // A reply only notifies when no browser is showing the app; iOS closes the
  // stream within seconds of the app leaving the screen.
  if (event.type === 'message' && !browsersOpen && event.folder && event.threadId) {
    return {
      title: await nameOf(event.folder),
      body: excerpt(event.text),
      url: threadUrl(event.folder, event.threadId),
      tag: event.threadId,
    }
  }
  return null
}

async function handle(type: string, data: string, id: string | undefined): Promise<void> {
  if (type === 'ready') {
    const ready = JSON.parse(data) as { boot: string; seq: number }
    if (boot !== null && ready.boot !== boot) broadcast({ type: 'resync' })
    if (ready.boot !== boot) seq = ready.seq
    boot = ready.boot
    return
  }
  if (type === 'resync') {
    broadcast({ type: 'resync' })
    return
  }
  if (id) seq = Number(id)
  const event = JSON.parse(data) as NanoclawEvent
  broadcast(event)
  const payload = await pushFor(event, clients.size > 0)
  if (payload) await pushAll(payload)
}

async function connectOnce(signal: AbortSignal): Promise<void> {
  const query = boot ? `?boot=${encodeURIComponent(boot)}&since=${seq}` : ''
  const res = await nanoclawFetch(`/events${query}`, { headers: { accept: 'text/event-stream' }, signal })
  if (!res.ok || !res.body) throw new Error(`event stream answered ${res.status}`)
  connected = true
  const parser = new SseParser()
  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const e of parser.push(decoder.decode(value, { stream: true }))) {
        await handle(e.event, e.data, e.id).catch((err) => console.warn('relay event failed', err))
      }
    }
  } finally {
    connected = false
  }
}

export function startRelay(): void {
  if (running) return
  running = true
  abort = new AbortController()
  const signal = abort.signal
  void (async () => {
    let delay = 1_000
    while (running) {
      const started = Date.now()
      try {
        await connectOnce(signal)
      } catch (err) {
        if (!running) break
        console.warn('relay disconnected:', (err as Error).message)
      }
      // A stream that stayed up a while was healthy; start backoff over.
      if (Date.now() - started > 60_000) delay = 1_000
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 30_000)
    }
  })()
}

export function stopRelay(): void {
  running = false
  abort?.abort()
  for (const send of clients) send(frame('resync', {}))
  clients.clear()
}
