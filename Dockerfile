# Keep the Node version in step with .mise.toml.

# --- Build: vite build (client + Nitro server) ---
FROM node:24.22-slim AS build
WORKDIR /app
# --ignore-scripts: better-sqlite3 ships prebuilt binaries, but `npm ci`
# doesn't see its `gypfile: false` in the lockfile and tries `node-gyp
# rebuild` (no Python here); nothing else needs its install script.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# --- Runtime: only .output. Nitro bundles the server and traces its native
# dependency (better-sqlite3) into .output/server/node_modules. ---
FROM node:24.22-slim
WORKDIR /app
COPY --from=build /app/.output ./.output

# Fail the image build, not the first request, if better-sqlite3 wasn't
# traced or has no binary for this platform.
RUN cd .output/server && node --input-type=module -e " \
  const { default: Database } = await import('better-sqlite3'); \
  new Database(':memory:').prepare('SELECT 1').get(); \
  console.log('native modules ok'); \
"

# The base image's `node` user is uid 1000, matching compose's
# `user: "1000:1000"`; it needs to write /data (a volume).
RUN mkdir -p /data && chown 1000:1000 /data && chmod -R a+rX /app

ENV NODE_ENV=production \
    PORT=3000 \
    RAVENS_DATA_DIR=/data

USER 1000:1000
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz', { signal: AbortSignal.timeout(4000) }).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# One process: the relay and the SQLite connection assume it.
CMD ["node", ".output/server/index.mjs"]
