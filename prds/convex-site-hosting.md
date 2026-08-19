# Convex site hosting: landing at root, web demo at /app/

Created: 2026-08-17 05:30 UTC
Last Updated: 2026-08-17 05:40 UTC
Status: Done

## Problem

The landing page and the Expo web demo had no hosting story. `DEMO_URL` shipped empty, so every demo link and screenshot on the landing site stayed hidden, and forks had to bring their own static host (GitHub Pages, Netlify, Vercel) plus a separate deploy flow for the web demo. Two hosts, two deploy paths, one template.

## Proposed solution

Serve everything from the Convex deployment that already runs the backend, using two instances of the official `@convex-dev/static-hosting` component:

- `staticHosting` at `/` serves `landing/` (deployed with `--no-spa`, real multi page site).
- `demoApp` at `/app/` serves the Expo web export (SPA fallback for expo-router).
- `defineApp({ httpPrefix: "/api" })` moves the app's own HTTP routes under `/api`, so the AgentMail webhook URL becomes `/api/agentmail/webhook`.

One command deploys it all. The landing page defaults `DEMO_URL` to `/app/` (same origin) and gains a run it on your phone section with a client side QR code encoding the demo URL.

## Files changed

- `packages/backend/convex/convex.config.ts` - httpPrefix /api, two static hosting instances.
- `packages/backend/convex/http.ts` - comment updated for the /api webhook URL.
- `packages/backend/package.json` - site:preview and site:deploy scripts (upload landing with --no-spa, build and upload the Expo web export to demoApp).
- `package.json` (root) - site:preview and site:deploy wrappers.
- `apps/native/app.json` - experiments.baseUrl "/app" for the web export sub path.
- `apps/native/package.json` - build:web script with VITE_CONVEX_URL passthrough to EXPO_PUBLIC_CONVEX_URL.
- `landing/index.html` - DEMO_URL defaults to /app/, run it on your phone section, QR rendered from vendored qrcode.min.js.
- `landing/docs.html` - DEMO_URL default, host it on Convex section, updated fork checklist copy.
- `landing/qrcode.min.js` - vendored qrcode-generator 1.4.4 (MIT).
- `docs/static-hosting.md` - new full guide.
- `docs/deploy.md` - web demo and landing deploy step.
- `docs/integrations.md` - webhook URL now /api/agentmail/webhook.
- `README.md` - landing section rewrite, components list, docs list.
- `files.md`, `task.md`, `changelog.md` - synced.

## Edge cases

- `experiments.baseUrl` affects `expo export` only; local `npx expo start` is unchanged.
- Landing served from a non Convex host: DEMO_URL resolves relative to that host, so the QR and links break unless DEMO_URL is set to a full URL or "". Documented in both script comments.
- The env passthrough in build:web needs a POSIX shell. Documented in docs/static-hosting.md.
- AgentMail webhook URL changed; anyone who registered the old `/agentmail/webhook` URL must re-register. Documented in docs/integrations.md.
- Convex HTTP routes answer GET, not HEAD; uptime checks must use GET.

## Verification steps

1. `npx convex dev` deploys the new config clean (two component instances install).
2. Both workspaces typecheck.
3. `npm run site:preview` uploads both sites to the dev deployment.
4. Browser and curl checks: `/` landing, `/docs.html`, `/app/` demo boots and talks to Convex, QR renders and encodes the deployed /app/ URL, `/api/agentmail/webhook` routes (405 or auth error, not 404).

## Task completion log

- 2026-08-17 05:35 UTC - Component installed, config mounted, Expo web build wired, deploy scripts added, landing pages updated with QR and phone section, docs written and synced. Verification pending.
- 2026-08-17 05:40 UTC - Verified. Dev deploy installed both instances, both workspaces typecheck, site:preview uploaded landing (7 files) and the Expo web export (21 files). Curl: / 200, /docs.html 200, /app/ 200 with the JS bundle, /nope 404, POST /api/agentmail/webhook routes (500 without the secret, proving the route), old /agentmail/webhook 404. Browser: QR renders in the phone section, demo links point at /app/, the web demo boots with the seeded roster and the Monday planning chat renders, no console errors.
