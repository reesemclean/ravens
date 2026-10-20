import { describe, expect, it } from 'vitest'
import { crossOriginRefusal, isPublicPath } from '~/start'

const req = (method: string, headers: Record<string, string>) =>
  new Request('http://ravens.example.com/api/messages', { method, headers })

describe('crossOriginRefusal', () => {
  it('lets same-host writes and all reads through', () => {
    expect(crossOriginRefusal(req('POST', { host: 'ravens.example.com', origin: 'https://ravens.example.com' }))).toBeNull()
    expect(crossOriginRefusal(req('GET', { host: 'ravens.example.com', origin: 'https://evil.example' }))).toBeNull()
  })

  it('refuses cross-site and null origins on writes', () => {
    expect(crossOriginRefusal(req('POST', { host: 'ravens.example.com', origin: 'https://evil.example' }))).not.toBeNull()
    expect(crossOriginRefusal(req('POST', { host: 'ravens.example.com', origin: 'null' }))).not.toBeNull()
  })
})

describe('isPublicPath', () => {
  it('opens only health and auth', () => {
    expect(isPublicPath('/healthz')).toBe(true)
    expect(isPublicPath('/api/auth/login/options')).toBe(true)
    expect(isPublicPath('/api/pending')).toBe(false)
    expect(isPublicPath('/api/events')).toBe(false)
  })
})
