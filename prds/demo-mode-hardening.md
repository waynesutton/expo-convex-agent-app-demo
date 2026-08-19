# Demo mode hardening

Created: 2026-08-17 06:05 UTC
Last Updated: 2026-08-17 06:20 UTC
Status: Done

## Problem

The hosted web demo at /app/ runs on a shared Convex deployment with no auth. Anyone can open it. That creates four gaps:

1. The Settings screen asks visitors to paste API keys into a public demo. Nobody should do that, and the demo should not encourage it.
2. Nothing stops profanity, spam, links, or abuse from landing in the shared database.
3. Visitors have no signal that the demo is shared: chats are visible to anyone with an id and demo content resets on a cron.
4. The About screen has no way back to the landing page that hosts the demo.

## Root cause

The template was built for a private fork first. Demo hosting arrived later (static hosting component) and the app never grew a demo posture: one deployment now serves strangers, but every screen still behaves like a personal install.

## Proposed solution

A backend driven demo mode, keyed off one Convex env var so a fork is clean by default.

- `DEMO_MODE=true` on the deployment turns it on. Off (unset) is the fork default and changes nothing.
- New public query `demo.config` reports `{ demoMode, chatEnabled, provider }`. No key material ever crosses the wire.
- Server key: `DEMO_LLM_PROVIDER` + `DEMO_LLM_API_KEY` (+ optional `DEMO_LLM_MODEL`) let the host power live replies. `agent.runAgent` takes an optional client key; when absent and demo mode is on, it uses the server key and ignores the client provider.
- Settings in demo mode: key inputs and provider chips are replaced by a read only status card. The active provider shows an Active badge. No part of any key is shown, ever.
- Moderation in `convex/lib/moderation.ts`, enforced server side in mutations:
  - Profanity blocked everywhere (messages, bot names and purposes, thread titles, app name, reminder messages).
  - In demo mode only: links blocked in chat, message length capped, rate limits applied.
- Rate limiting via the official `@convex-dev/rate-limiter` component (per the components-first rule): 10 messages/min and 6 bots/hour per user, demo mode only.
- Cleanup: the existing 5 minute reset cron, in demo mode, also deletes visitor created threads, bots, and skills idle for more than 5 minutes.
- Banners: home and chat screens show "public demo, resets every 5 minutes" when demo mode is on. Landing page copy says chats are public.
- About screen gains a landing page row derived from `EXPO_PUBLIC_CONVEX_URL` (.convex.cloud to .convex.site).

## Files to change

- packages/backend/convex/lib/moderation.ts (new)
- packages/backend/convex/lib/rateLimits.ts (new)
- packages/backend/convex/convex.config.ts (rate limiter component)
- packages/backend/convex/demo.ts (config query, demo cleanup)
- packages/backend/convex/messages.ts, bots.ts, threads.ts, users.ts (enforce moderation)
- packages/backend/convex/agent.ts (optional apiKey, server demo key)
- apps/native/app/settings.tsx, chat/[threadId].tsx, index.tsx, about.tsx
- apps/native/lib/links.ts
- landing/index.html (public chats copy)
- docs/demo-mode.md (new), README.md, files.md, changelog.md, task.md

## Edge cases

- Demo mode off: every check short circuits; forks behave exactly as before except profanity blocking, which is intentional and documented with a one line removal.
- Demo mode on with no server key: sending is blocked with a clear notice instead of a silent failure. Posed demo chats still work.
- Client passes its own key while demo mode is on: allowed; moderation still applies.
- Cleanup never touches seeded demo bots or threads, and never deletes a thread that saw a message in the last 5 minutes, so an active visitor is not cut off mid chat.
- ConvexError carries the user facing block reason; the composer keeps the draft.

## Verification steps

1. `npm run typecheck` passes in both workspaces.
2. Convex dev deploys the new config (rate limiter component mounts).
3. With DEMO_MODE unset: send flow unchanged, settings shows key inputs.
4. `npx convex env set DEMO_MODE true`: settings shows the status card, home shows the public banner, profane or link bearing messages are rejected with a notice.
5. `npm run site:preview` republishes the landing site and web demo.

## Task completion log

- 2026-08-17 06:05 UTC: PRD created, implementation started.
- 2026-08-17 06:12 UTC: Backend and app changes landed; both workspaces typecheck; rate limiter component deployed to dev.
- 2026-08-17 06:14 UTC: Server side moderation verified with convex run: f*cking, fucking, sh1t, and f#ck all rejected, clean text (including the word "classic") accepted, links rejected in demo mode. Fixed the initial gap where * was stripped instead of treated as a wildcard.
- 2026-08-17 06:18 UTC: DEMO_MODE=true set on the dev deployment, site:preview republished landing and web demo, browser smoke test passed all five checks (landing copy, public banner, locked settings card with Active/Not configured labels, chat banner, blocked send notice).
