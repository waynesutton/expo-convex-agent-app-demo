# Host the site on Convex

The Convex deployment that runs your backend can serve your static files too. This template uses the official [static hosting component](https://www.convex.dev/components/static-hosting) (`@convex-dev/static-hosting`) to put the landing page, the web demo, and the API behind one URL. No second host, no DNS setup, no extra account.

## What lives where

After a deploy, your `.convex.site` URL serves three things:

| Path | Content | Source |
|---|---|---|
| `/` and `/docs.html` | The landing site | `landing/` folder, uploaded as is |
| `/app/` | The Expo app exported for web | `apps/native`, built by `expo export` |
| `/api/...` | The backend's own HTTP routes | `packages/backend/convex/http.ts` |

The AgentMail inbound webhook is an `/api` route, so its registered URL is `https://<your-deployment>.convex.site/api/agentmail/webhook`.

## How it is wired

Everything ships preconfigured in the template. The pieces, so you know what to touch when you fork:

`packages/backend/convex/convex.config.ts` mounts two instances of the component:

```ts
const app = defineApp({ httpPrefix: "/api" });
app.use(staticHosting, { httpPrefix: "/" });
app.use(staticHosting, { name: "demoApp", httpPrefix: "/app/" });
```

- `httpPrefix: "/api"` on `defineApp` moves your own HTTP routes under `/api` so the component can own the root.
- The first instance serves `landing/`. It deploys with `--no-spa` since the landing site is a real multi page site and unknown paths should 404.
- The `demoApp` instance serves the Expo web export under `/app/` with SPA fallback, so expo-router client routes survive a reload.

`apps/native/app.json` sets `experiments.baseUrl: "/app"` so the exported bundle resolves its assets under the sub path. This only affects `expo export`; local `npx expo start` is unchanged.

`apps/native/package.json` has a `build:web` script that forwards the Convex URL the CLI injects:

```json
"build:web": "EXPO_PUBLIC_CONVEX_URL=${VITE_CONVEX_URL:-$EXPO_PUBLIC_CONVEX_URL} expo export --platform web"
```

The upload CLI sets `VITE_CONVEX_URL` to the target deployment when it runs the build. The passthrough hands that value to Expo, so the demo always talks to the deployment that serves it: dev URL on preview, prod URL on deploy. Run `npm run build:web` on its own and it falls back to your `.env.local` value.

## Deploy

Both commands run from the repo root.

```bash
npm run site:preview   # upload both sites to your dev deployment
npm run site:deploy    # npx convex deploy, then upload both sites to prod
```

Preview lands at your dev deployment's `.convex.site` URL, production at your prod deployment's. Under the hood each command uploads the landing folder with `--no-spa`, then builds the Expo web export and uploads it to the `demoApp` instance. Uploads publish atomically: visitors never see a page pointing at assets that are not there yet, and a failed upload leaves the previous deploy live.

Use `site:preview` as a smoke test before `site:deploy`. It exercises the real HTTP routing, cache headers, base path, and SPA fallback that the local dev servers do not.

One prerequisite for the first `site:deploy`: env vars are per deployment, and the Firecrawl component requires `FIRECRAWL_API_KEY` to exist before a push succeeds. Your dev deployment got the placeholder during setup, but prod starts empty, so the deploy fails with a `MissingEnvironmentVariable` error. Fix it once from `packages/backend`:

```bash
npx convex env set FIRECRAWL_API_KEY unset --prod   # or a real fc-... key
npx convex env set DEMO_MODE true --prod            # if you want the seeded demo chats on prod
```

## Development stays local

Static hosting is a deploy target, not a dev server. Keep the normal loop:

```bash
npm run dev   # convex dev plus expo start, from the root
```

## The landing page QR code

`landing/index.html` renders a QR code that encodes the absolute URL of `DEMO_URL` (default `/app/`), resolved against wherever the page is served. Scan it on a phone and the web demo opens in the browser. The QR is generated client side by `landing/qrcode.min.js` (the MIT licensed qrcode-generator library, vendored), so nothing calls an external image service. Set `DEMO_URL` to `""` in the script tag to hide the QR and the demo links.

## Custom domains

`<deployment>.convex.site` works out of the box. To serve from your own domain, add it in the Convex dashboard under project settings. Guide: [docs.convex.dev/production/hosting/custom](https://docs.convex.dev/production/hosting/custom).

## Limits and notes

- Convex HTTP routers expose GET but not HEAD. Point uptime monitors at a lightweight GET.
- One upload supports up to 1,800 files. The landing folder and an Expo web export are far below that.
- Hashed assets get long term cache headers; HTML revalidates with ETags, so a new deploy shows up on the next load.
- The upload CLI authenticates through your Convex CLI session. There is no public upload endpoint.
- The env passthrough in `build:web` uses shell parameter expansion, so run deploys from a POSIX shell (macOS and Linux terminals are fine; on Windows use WSL or Git Bash).
