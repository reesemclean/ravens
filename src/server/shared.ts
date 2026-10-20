// Nitro builds the startup plugin and the routes as separate bundles, so a
// server module can be loaded twice. State that both need (the relay's
// connection and browsers, the SQLite handle) lives on globalThis instead of
// in module variables.
export function shared<T extends object>(key: string, init: () => T): T {
  const store = globalThis as unknown as Record<symbol, T>
  const name = Symbol.for(`ravens.${key}`)
  return (store[name] ??= init())
}
