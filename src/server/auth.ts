// Passkey login for the one person who uses this app.
//
// Enrollment: the first passkey needs RAVENS_ENROLL_CODE (from 1Password),
// and only while no passkey exists, unless RAVENS_ALLOW_ENROLL=true. Login:
// a discoverable-credential ceremony (no username), so Face ID is the whole
// flow. A session is a random cookie; only its SHA-256 is stored, with a
// 30-day expiry that slides forward as the app is used.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { settings } from './config'
import { db } from './db'

export const SESSION_COOKIE = 'ravens_session'
const SESSION_DAYS = 30
const SLIDE_AFTER_MS = 24 * 60 * 60 * 1000
const CHALLENGE_MS = 5 * 60 * 1000
// Fixed: there is one user, and every passkey belongs to them.
const USER_ID = new TextEncoder().encode('ravens-owner')

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const now = () => Date.now()

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function credentialCount(): number {
  return (db().prepare('SELECT count(*) AS n FROM credentials').get() as { n: number }).n
}

/** Why enrollment is refused, or null when the code opens it. */
export function enrollRefusal(code: string | undefined): string | null {
  if (!settings.enrollCode) return 'Enrollment is not configured.'
  if (!code || !safeEqual(code, settings.enrollCode)) return 'That enrollment link is not valid.'
  if (credentialCount() > 0 && !settings.allowEnroll) return 'A passkey is already enrolled.'
  return null
}

function saveChallenge(kind: 'register' | 'login', challenge: string): string {
  const id = randomBytes(16).toString('base64url')
  db().prepare('DELETE FROM challenges WHERE expires_at < ?').run(now())
  db()
    .prepare('INSERT INTO challenges (id, challenge, kind, expires_at) VALUES (?, ?, ?, ?)')
    .run(id, challenge, kind, now() + CHALLENGE_MS)
  return id
}

/** Single use: a challenge is deleted as it's read. */
function takeChallenge(kind: 'register' | 'login', id: string): string | null {
  const row = db()
    .prepare('SELECT challenge, expires_at FROM challenges WHERE id = ? AND kind = ?')
    .get(id, kind) as { challenge: string; expires_at: number } | undefined
  db().prepare('DELETE FROM challenges WHERE id = ?').run(id)
  return row && row.expires_at >= now() ? row.challenge : null
}

export async function registrationOptions() {
  const existing = db().prepare('SELECT id, transports FROM credentials').all() as Array<{
    id: string
    transports: string | null
  }>
  const options = await generateRegistrationOptions({
    rpName: 'Ravens',
    rpID: settings.rpId,
    userName: 'ravens',
    userDisplayName: 'Ravens',
    userID: USER_ID,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransport[]) : undefined,
    })),
  })
  return { options, challengeId: saveChallenge('register', options.challenge) }
}

export async function verifyRegistration(challengeId: string, response: RegistrationResponseJSON): Promise<string> {
  const expectedChallenge = takeChallenge('register', challengeId)
  if (!expectedChallenge) throw new Error('The enrollment request expired. Try again.')
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: settings.origin,
    expectedRPID: settings.rpId,
    requireUserVerification: true,
  })
  if (!result.verified) throw new Error('The passkey could not be verified.')
  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo
  db()
    .prepare(
      `INSERT INTO credentials (id, public_key, counter, transports, device_type, backed_up, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      credential.id,
      Buffer.from(credential.publicKey),
      credential.counter,
      JSON.stringify(credential.transports ?? []),
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      now(),
    )
  return credential.id
}

export async function loginOptions() {
  const options = await generateAuthenticationOptions({ rpID: settings.rpId, userVerification: 'required' })
  return { options, challengeId: saveChallenge('login', options.challenge) }
}

export async function verifyLogin(challengeId: string, response: AuthenticationResponseJSON): Promise<string> {
  const expectedChallenge = takeChallenge('login', challengeId)
  if (!expectedChallenge) throw new Error('The sign-in request expired. Try again.')
  const row = db().prepare('SELECT id, public_key, counter, transports FROM credentials WHERE id = ?').get(response.id) as
    | { id: string; public_key: Buffer; counter: number; transports: string | null }
    | undefined
  if (!row) throw new Error('This passkey is not enrolled here.')
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: settings.origin,
    expectedRPID: settings.rpId,
    requireUserVerification: true,
    credential: {
      id: row.id,
      publicKey: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: row.transports ? (JSON.parse(row.transports) as AuthenticatorTransport[]) : undefined,
    },
  })
  if (!result.verified) throw new Error('The passkey could not be verified.')
  db()
    .prepare('UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?')
    .run(result.authenticationInfo.newCounter, now(), row.id)
  return row.id
}

export function createSession(credentialId: string): string {
  const token = randomBytes(32).toString('base64url')
  db()
    .prepare('INSERT INTO sessions (id_hash, credential_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), credentialId, now(), now() + SESSION_DAYS * 86_400_000)
  return token
}

/** True for a live session; extends it when it's more than a day old. */
export function checkSession(token: string | undefined): boolean {
  if (!token) return false
  const hash = sha256(token)
  const row = db()
    .prepare(
      `SELECT s.expires_at FROM sessions s JOIN credentials c ON c.id = s.credential_id
        WHERE s.id_hash = ?`,
    )
    .get(hash) as { expires_at: number } | undefined
  if (!row || row.expires_at < now()) return false
  const fresh = now() + SESSION_DAYS * 86_400_000
  if (fresh - row.expires_at > SLIDE_AFTER_MS) {
    db().prepare('UPDATE sessions SET expires_at = ? WHERE id_hash = ?').run(fresh, hash)
  }
  return true
}

export function endSession(token: string | undefined): void {
  if (token) db().prepare('DELETE FROM sessions WHERE id_hash = ?').run(sha256(token))
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function sessionCookie(token: string): string {
  const secure = settings.origin.startsWith('https:') ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function isSignedIn(request: Request): boolean {
  return checkSession(readCookie(request, SESSION_COOKIE))
}
