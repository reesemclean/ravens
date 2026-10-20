# Ravens

A phone app (an installable PWA) for NanoClaw: your ravens (agent groups),
their threads, and the approvals that need you, with push notifications.

```
iPhone (Home Screen app) ── https://ravens.example.com ── Traefik (docker-lxc)
                                                              │
                                    Ravens (this app, stacks/ravens in homelab)
                                    passkey login · Web Push · SQLite /data
                                                              │ bearer token, server to server
                                    NanoClaw web channel (<nanoclaw-host>:3211)
                                    /add-web skill in reesemclean/nanoclaw
```

Browsers only ever talk to Ravens. Ravens holds NanoClaw's token and keeps
one connection to its event stream open at all times, so a new approval card
becomes a push notification even when the app is closed.

## What it does

- **Ravens:** every agent group, with the cards waiting on you at the top
  ("Needs you").
- **Threads:** each raven's conversations, newest first. A new thread is a new
  NanoClaw session with its own context; its first message becomes its title.
- **Approvals:** the same choices as NanoClaw's Telegram cards. A click resolves
  the card at once, except a gateway approval, which waits for the gateway to
  confirm. "Reject with reason…" asks for the reason in the card.
- **Push:** a new card always notifies; a reply notifies only when the app
  isn't open. iOS shows no buttons on web notifications, so a tap opens the
  card.

## Configuration

| Variable | |
| --- | --- |
| `RAVENS_ORIGIN` | The URL the browser uses, e.g. `https://ravens.example.com`. Passkeys are bound to its hostname. |
| `RAVENS_ENROLL_CODE` | Opens `/enroll?code=…` while no passkey exists. |
| `RAVENS_ALLOW_ENROLL` | `true` lets a second passkey enroll (another device). Leave unset otherwise. |
| `NANOCLAW_URL` | The web channel, e.g. `http://<nanoclaw-host>:3211`. |
| `NANOCLAW_WEB_TOKEN` | The channel's bearer token: `data/web/token` in the NanoClaw checkout. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push keys (`npx web-push generate-vapid-keys`) and a `mailto:` contact. Without them, push is off. |
| `RAVENS_DATA_DIR` | SQLite lives here (`/data` in the image). |

## First sign-in

1. Open `https://ravens.example.com/enroll?code=<RAVENS_ENROLL_CODE>` on the
   phone and create a passkey.
2. Share › Add to Home Screen, then open Ravens from the Home Screen.
3. Tap **Turn on notifications**. iOS only offers it inside the Home Screen
   app.

Sign-ins after that are Face ID. To add another device, set
`RAVENS_ALLOW_ENROLL=true`, enroll it, and unset it again.

## Development

```sh
npm ci --ignore-scripts
npm run dev        # http://localhost:3000
npm test
npm run typecheck
```

The NanoClaw web channel only admits docker-lxc, so for local work tunnel
through it: `ssh -N -L 13211:<nanoclaw-host>:3211 <docker-host>`, then
`NANOCLAW_URL=http://127.0.0.1:13211`. Passkeys work on `localhost`.

CI pushes `ghcr.io/reesemclean/ravens:dev` after every green build on `main`;
homelab's `stacks/ravens` follows that tag.
