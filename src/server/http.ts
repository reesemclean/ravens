// Helpers for server routes.
import { NanoclawError } from './nanoclaw'

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = (await request.json()) as unknown
    return (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as T
  } catch {
    return {} as T
  }
}

/** NanoClaw's 4xx answers pass through; anything else is a bad gateway. */
export function errorResponse(err: unknown): Response {
  if (err instanceof NanoclawError && err.status >= 400 && err.status < 500 && err.status !== 401) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.warn('nanoclaw request failed', err)
  return Response.json({ error: 'NanoClaw is not reachable right now.' }, { status: 502 })
}

export async function proxied<T>(work: () => Promise<T>, status = 200): Promise<Response> {
  try {
    return Response.json(await work(), { status })
  } catch (err) {
    return errorResponse(err)
  }
}
