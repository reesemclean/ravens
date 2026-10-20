// Everything the server reads from its environment, read once.
import path from 'node:path'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function origin(): string {
  const raw = process.env.RAVENS_ORIGIN || 'http://localhost:3000'
  return new URL(raw).origin
}

export const settings = {
  /** The browser-facing origin. Passkeys are bound to its hostname. */
  get origin() {
    return origin()
  },
  get rpId() {
    return new URL(origin()).hostname
  },
  get dataDir() {
    return path.resolve(process.env.RAVENS_DATA_DIR || '.local/data')
  },
  /** One-time code that lets the first passkey enroll (from 1Password). */
  get enrollCode() {
    return process.env.RAVENS_ENROLL_CODE || ''
  },
  /** Allow enrolling another passkey while one already exists. */
  get allowEnroll() {
    return process.env.RAVENS_ALLOW_ENROLL === 'true'
  },
  get nanoclawUrl() {
    return (process.env.NANOCLAW_URL || 'http://127.0.0.1:3211').replace(/\/+$/, '')
  },
  get nanoclawToken() {
    return required('NANOCLAW_WEB_TOKEN')
  },
  get vapid() {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) return null
    return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com' }
  },
}
