// Connect to NanoClaw when the process starts, not on the first request:
// approval pushes have to flow before anyone opens the app.
import type { NitroApp } from 'nitro/types'
import { closeDb, db } from '../server/db'
import { startRelay, stopRelay } from '../server/relay'

export default function startup(nitroApp: NitroApp) {
  db()
  if (process.env.NANOCLAW_WEB_TOKEN) startRelay()
  else console.warn('NANOCLAW_WEB_TOKEN is not set: not connecting to NanoClaw')
  nitroApp.hooks?.hook('close', () => {
    stopRelay()
    closeDb()
  })
}
