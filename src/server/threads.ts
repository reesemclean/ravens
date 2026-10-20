// What Ravens adds to NanoClaw's threads: titles (NanoClaw keeps none, so a
// thread is named by its first message from here) and archiving.
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

/** Archiving only hides the thread here; it can always be reopened. */
export function setArchived(folder: string, threadId: string, archived: boolean): void {
  if (archived) {
    db()
      .prepare(
        `INSERT INTO thread_archive (folder, thread_id, archived_at) VALUES (?, ?, ?)
         ON CONFLICT (folder, thread_id) DO NOTHING`,
      )
      .run(folder, threadId, Date.now())
  } else {
    db().prepare('DELETE FROM thread_archive WHERE folder = ? AND thread_id = ?').run(folder, threadId)
  }
}

export function annotate(folder: string, threads: Array<Omit<Thread, 'title' | 'archived'>>): Thread[] {
  const rows = db().prepare('SELECT thread_id, title FROM thread_meta WHERE folder = ?').all(folder) as Array<{
    thread_id: string
    title: string
  }>
  const titles = new Map(rows.map((r) => [r.thread_id, r.title]))
  const archived = new Set(
    (db().prepare('SELECT thread_id FROM thread_archive WHERE folder = ?').all(folder) as Array<{ thread_id: string }>).map(
      (r) => r.thread_id,
    ),
  )
  return threads.map((t) => ({ ...t, title: titles.get(t.threadId) ?? null, archived: archived.has(t.threadId) }))
}

export async function threadsWithTitles(folder: string): Promise<Thread[]> {
  return annotate(folder, await nanoclaw.threads(folder))
}
