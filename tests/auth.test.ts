import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkSession, createSession, endSession, enrollRefusal, readCookie } from '~/server/auth'
import { openDb, setDb, db } from '~/server/db'

beforeEach(() => {
  setDb(openDb(':memory:'))
  process.env.RAVENS_ENROLL_CODE = 'open-sesame'
  delete process.env.RAVENS_ALLOW_ENROLL
})
afterEach(() => setDb(null))

function addCredential(id = 'cred-1') {
  db()
    .prepare('INSERT INTO credentials (id, public_key, counter, created_at) VALUES (?, ?, 0, ?)')
    .run(id, Buffer.from([1]), Date.now())
}

describe('enrollRefusal', () => {
  it('needs the code, and only while no passkey exists', () => {
    expect(enrollRefusal('nope')).toMatch(/not valid/)
    expect(enrollRefusal(undefined)).toMatch(/not valid/)
    expect(enrollRefusal('open-sesame')).toBeNull()
    addCredential()
    expect(enrollRefusal('open-sesame')).toMatch(/already enrolled/)
    process.env.RAVENS_ALLOW_ENROLL = 'true'
    expect(enrollRefusal('open-sesame')).toBeNull()
  })

  it('is closed when no code is configured', () => {
    process.env.RAVENS_ENROLL_CODE = ''
    expect(enrollRefusal('')).toMatch(/not configured/)
  })
})

describe('sessions', () => {
  it('stores only a hash, checks, and ends', () => {
    addCredential()
    const token = createSession('cred-1')
    const stored = db().prepare('SELECT id_hash FROM sessions').get() as { id_hash: string }
    expect(stored.id_hash).not.toContain(token)
    expect(checkSession(token)).toBe(true)
    expect(checkSession('forged')).toBe(false)
    endSession(token)
    expect(checkSession(token)).toBe(false)
  })

  it('dies with its passkey and when expired', () => {
    addCredential()
    const token = createSession('cred-1')
    db().prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1)
    expect(checkSession(token)).toBe(false)
    const other = createSession('cred-1')
    db().prepare('DELETE FROM credentials').run()
    expect(checkSession(other)).toBe(false)
  })
})

describe('readCookie', () => {
  it('finds one cookie among several', () => {
    const req = new Request('http://x', { headers: { cookie: 'a=1; ravens_session=abc%3D; b=2' } })
    expect(readCookie(req, 'ravens_session')).toBe('abc=')
    expect(readCookie(req, 'missing')).toBeUndefined()
  })
})
