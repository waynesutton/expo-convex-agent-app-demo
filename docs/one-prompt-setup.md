# One prompt setup

Copy the prompt below into Claude Code, Cursor, Codex, or any coding agent opened at the root of your fork. That is the whole setup. You can finish it with zero API keys.

The same text is on the landing page copy button and in the README.

---

## The prompt

```
Set up this expo-demo repo so I have a running mobile agent chat app.

Follow AGENTS.md exactly. You can finish setup with zero API keys.

Steps:

1. Run `npm install` at the repo root.
2. Start the Convex backend from packages/backend.
   Prefer `CONVEX_AGENT_MODE=anonymous npx convex dev` if I am not logged
   in or you cannot handle a login prompt. That provisions an isolated
   local deployment with no Convex account (see docs/setup.md).
   If I am already logged in, `npx convex dev` is fine.
   Keep it running and capture the deployment URL it prints
   (cloud URL, or http://127.0.0.1:3210 in agent mode).
3. The Firecrawl component requires FIRECRAWL_API_KEY to exist before a
   push succeeds. I do not need a real key. Run
   `npx convex env set FIRECRAWL_API_KEY unset` from packages/backend.
   The app treats `unset` as not configured.
4. Create apps/native/.env.local from .env.example and set
   EXPO_PUBLIC_CONVEX_URL to that deployment URL.
5. Start the app from apps/native: `npx expo start`. Tell me to scan
   the QR with Expo Go, or use `npx expo start --web` if I have no phone.
6. Do not ask me for API keys to finish setup. Firecrawl, AgentMail,
   Merge, and Runware are optional. If I later give you keys, set them
   with `npx convex env set` from packages/backend.
7. The app opens with three seeded demo chats (Chief of Staff, Coach,
   Research Bot) that a Convex cron resets every 5 minutes. I can browse
   them with no model key. A model key in Settings is only needed to send
   a live reply (Anthropic, OpenAI, xAI, OpenRouter, or Concentrate).
   It stays on my device and never touches the database.
8. Verify: the roster loads, a demo chat opens, and the demo banner is
   visible. If I paste a model key, send "hello" and confirm a reply.
   If anything fails, read `npx convex logs` and fix forward.
9. Optional: to publish the landing page and web demo, set
   `npx convex env set FIRECRAWL_API_KEY unset --prod` from
   packages/backend, then run `npm run site:deploy` from the root.
   See docs/static-hosting.md.

Rules while you work: do not add any auth provider (Convex Auth comes
later, nothing else ever), do not persist or log my API keys, and if a
package version is stale, update it rather than pinning backward.
```

---

## Why one prompt works

The setup is deterministic. `npx convex dev` (or anonymous agent mode) provisions the backend and generates types. Expo reads one env var. Firecrawl needs the env var to exist, not a real key. Everything else is documented in AGENTS.md.

The demo chats are part of the template. Two Convex crons run every 5 minutes: one rewrites the demo chats back to their script so the app always opens posed, and one delivers bot reminders as push notifications.

If you use EAS already, tell your agent: "use `eas integrations:convex:connect` instead of steps 2 and 4." One command provisions Convex and writes env vars for local dev plus every EAS environment. The Convex dashboard invite arrives by email.

## Troubleshooting

- Typecheck fails on `convex/_generated`: `npx convex dev` was not run yet. It generates those files.
- Push fails with MissingEnvironmentVariable for Firecrawl: run `npx convex env set FIRECRAWL_API_KEY unset`.
- Expo Go shows a network error: phone and laptop must share a network, or run `npx expo start --tunnel`.
- Agent replies with a key error: the model key in Settings is missing or wrong. Browsing demo chats does not need one.
