import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  nitro: {
    // Connects to NanoClaw's event stream when the process starts, not on the
    // first request: push notifications have to flow with no browser open.
    plugins: ['./src/nitro/startup.ts'],
    // Left unbundled: it imports reflect-metadata for @peculiar/x509, and
    // bundling puts x509 in a chunk that runs before that polyfill.
    traceDeps: ['@simplewebauthn/server'],
  },
  plugins: [
    // src/start.ts's middleware replaces Start's server-function CSRF guard
    // (and covers every write, not only server functions).
    tanstackStart({ serverFns: { disableCsrfMiddlewareWarning: true } }),
    nitro(),
    viteReact(),
  ],
})
