// Thread titles, which NanoClaw doesn't keep: a thread is named by its first
// message from here.
import type { Thread } from '~/lib/types'
import { db } from './db'
import { nanoclaw } from './nanoclaw'

const TITLE_CHARS = 80

export function titleFrom(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > TITLE_CHARS ? `${flat.slice(0, TITLE_CHARS - 1)}…` : flat
}

export function rememberTitle(folder: string, threadId: string, text: string): void {
  db()
    .prepare(
      `INSERT INTO thread_meta (folder, thread_id, title, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (folder, thread_id) DO NOTHING`,
    )
    .run(folder, threadId, titleFrom(text), Date.now())
}

export async function threadsWithTitles(folder: string): Promise<Thread[]> {
  const threads = await nanoclaw.threads(folder)
  const rows = db().prepare('SELECT thread_id, title FROM thread_meta WHERE folder = ?').all(folder) as Array<{
    thread_id: string
    title: string
  }>
  const titles = new Map(rows.map((r) => [r.thread_id, r.title]))
  return threads.map((t) => ({ ...t, title: titles.get(t.threadId) ?? null }))
}
