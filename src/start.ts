// Start's global configuration: request middleware runs before every server
// route, page render and server function.
import { createMiddleware, createStart } from '@tanstack/react-start'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function netloc(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

/** Why a write is refused, or null to let it through.
 *
 * Only host:port is compared: TLS ends at Traefik, so the scheme the browser
 * saw isn't the one we see. `Origin: null` is refused. Requests with neither
 * Origin nor Referer pass (they can't carry the session cookie cross-site
 * anyway: it's SameSite=Lax). */
export function crossOriginRefusal(request: Request): string | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null
  const source = request.headers.get('origin') || request.headers.get('referer')
  if (!source) return null
  const host = (request.headers.get('host') || '').toLowerCase()
  return netloc(source) === host ? null : 'cross-origin request refused'
}

/** API routes that work signed out. */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/healthz' || pathname.startsWith('/api/auth/')
}

const guard = createMiddleware().server(async ({ request, next }) => {
  const error = crossOriginRefusal(request)
  if (error) return Response.json({ error }, { status: 403 })
  const { pathname } = new URL(request.url)
  if (pathname.startsWith('/api/') && !isPublicPath(pathname)) {
    const { isSignedIn } = await import('./server/auth')
    if (!isSignedIn(request)) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [guard],
}))
