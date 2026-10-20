// SQLite: passkeys, sessions, push subscriptions and thread titles. One
// file, WAL, one Node process. Schema changes are appended to MIGRATIONS,
// never edited in place; `user_version` counts how many ran.
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { settings } from './config'

export const MIGRATIONS: string[] = [
  `
  CREATE TABLE credentials (
    id TEXT PRIMARY KEY,                -- base64url credential id
    public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,                    -- JSON array
    device_type TEXT,
    backed_up INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER
  );
  -- Challenges live a few minutes; one row per ceremony in flight.
  CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    kind TEXT NOT NULL,                 -- 'register' | 'login'
    expires_at INTEGER NOT NULL
  );
  -- Only a hash of the cookie value is stored.
  CREATE TABLE sessions (
    id_hash TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  -- NanoClaw has no thread titles; the first message names a thread.
  CREATE TABLE thread_meta (
    folder TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (folder, thread_id)
  );
  `,
]

let instance: Database.Database | null = null

export function openDb(file: string): Database.Database {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const version = db.pragma('user_version', { simple: true }) as number
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]!)
      db.pragma(`user_version = ${i + 1}`)
    })()
  }
  return db
}

export function db(): Database.Database {
  if (!instance) {
    fs.mkdirSync(settings.dataDir, { recursive: true })
    instance = openDb(path.join(settings.dataDir, 'ravens.db'))
  }
  return instance
}

/** Tests swap in an in-memory database. */
export function setDb(next: Database.Database | null): void {
  instance?.close()
  instance = next
}

export function closeDb(): void {
  instance?.close()
  instance = null
}
