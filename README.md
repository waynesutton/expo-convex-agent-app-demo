# expo-demo

A mobile agent chat template. Expo on the front, Convex on the back, your model keys on the device.

Fork it, paste the setup prompt, and you have a native agent app with realtime chat, group chats with @mentions, importable skills, bot memory, reminders on a cron, full text search, PNG bot avatars, web scraping via Firecrawl, email via AgentMail, push notifications, and file uploads. Auth is planned (Convex Auth only) but not wired, so you can ship a prototype today.

**You can run this with zero API keys.** Seeded demo chats load on first open. Tool keys are optional. A model key is only needed when you want a live reply. Coding agents that cannot log into Convex use anonymous agent mode.

Live site: [sincere-marmot-167.convex.site](https://sincere-marmot-167.convex.site) (landing at `/`, web demo at `/app/`). Repo: [github.com/waynesutton/expo-convex-agent-app-demo](https://github.com/waynesutton/expo-convex-agent-app-demo).

## What you get

- Named bots with a job, identity color, and optional PNG avatar
- Group chats where bots read each other and @mentions route a message
- Skill import (paste text or a URL) and durable bot memory
- One reminder per bot, delivered by a 5 minute Convex cron as a push
- Full text search across bots, chats, and messages
- BYOK model keys in expo-secure-store (Anthropic, OpenAI, xAI, OpenRouter, Concentrate)
- Optional workspace tools: Firecrawl scrape/search, AgentMail email, Merge business data, Runware images
- Posed demo: Chief of Staff, Coach, Research Bot, plus a Monday planning group. A cron resets those chats every 5 minutes
- Demo mode for public hosting (`DEMO_MODE=true`): locked keys, moderation, rate limits, idle cleanup
- One URL hosting: landing page, Expo web demo, and backend HTTP on the same Convex deployment

## Folder structure

```
expo-demo/
├── apps/native            Expo app (expo-router, TypeScript, React Native)
│   ├── app/               Screens: roster, chat, new bot, bot settings, new group, search, settings, about
│   ├── components/        BotAvatar, BotSidebar, MessageBubble, Composer, ToolCallCard, ThinkingDots, DemoBanner
│   └── lib/               theme, convex client, secure key storage, push, links
├── packages/backend       Convex backend (schema, functions, agent loop, tools)
│   └── convex/            users, bots, threads, messages, agent, search, demo, reminders, crons, http
├── landing/               Static site: index.html, docs.html, screens, vendored QR library
├── docs/                  Setup, agent mode, BYOK, auth plan, GitHub, deploy, static hosting
├── AGENTS.md              Instructions for coding agents (source of truth)
├── PRD.md                 What this is and why
└── package.json           npm workspaces: `npm run dev`, `site:preview`, `site:deploy`
```

Three pieces, one repo:

| Piece | Path | What it is |
|---|---|---|
| Expo app | `apps/native` | The product. Run with Expo Go, export for web, or build with EAS. |
| Convex backend | `packages/backend` | Database, queries, mutations, the agent action, crons, HTTP. |
| Landing site | `landing/` | Two HTML pages, no build step. Copyable setup prompt and App docs. |

The Expo app imports generated API types from `@expo-demo/backend`. Do not duplicate those types.

## How Convex static hosting works

The same Convex deployment that runs your functions serves the static files through [`@convex-dev/static-hosting`](https://www.convex.dev/components/static-hosting). Two component instances are mounted in `packages/backend/convex/convex.config.ts`:

| Path on `.convex.site` | Content | Source |
|---|---|---|
| `/` and `/docs.html` | Landing site | `landing/` uploaded as is (`--no-spa`) |
| `/app/` | Expo web demo | `apps/native` via `expo export`, SPA fallback |
| `/api/...` | Backend HTTP | `packages/backend/convex/http.ts` (app `httpPrefix` is `/api`) |

`apps/native/app.json` sets `experiments.baseUrl` to `/app` so the exported bundle resolves assets under that path. Local `npx expo start` is unchanged.

Full guide: [`docs/static-hosting.md`](docs/static-hosting.md).

## Copy this prompt (agent setup)

Open the repo in Claude Code, Cursor, Codex, or any coding agent and paste:

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

Same text lives in [`docs/one-prompt-setup.md`](docs/one-prompt-setup.md) and on the [landing page](https://sincere-marmot-167.convex.site/#prompt). `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/` are checked in so the agent already knows the hard rules.

Anonymous agent mode (`CONVEX_AGENT_MODE=anonymous`) is the path for unattended agents: local Convex at `http://127.0.0.1:3210`, no account. Details: [`docs/setup.md`](docs/setup.md) and [Convex agent mode](https://docs.convex.dev/cli/agent-mode).

## Manual setup

Requirements: Node 20+, npm 10+, Expo Go or a simulator. A Convex account is optional if you use agent mode.

```bash
git clone https://github.com/waynesutton/expo-convex-agent-app-demo.git expo-demo
cd expo-demo
npm install

cd packages/backend
# Logged in: npx convex dev
# No login / coding agent:
CONVEX_AGENT_MODE=anonymous npx convex dev
# Required even with no Firecrawl key:
npx convex env set FIRECRAWL_API_KEY unset
```

Leave `convex dev` running. In a second terminal:

```bash
cd apps/native
cp .env.example .env.local
# Cloud: EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
# Agent mode: EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
npx expo start
```

Scan the QR with Expo Go. You should see the bot roster and three seeded chats. Paste a model key in Settings only when you want to send.

Already using EAS? `eas integrations:convex:connect` provisions Convex and writes env vars for local dev and every EAS environment. See [`docs/setup.md`](docs/setup.md).

## Optional keys

Two kinds of keys, two homes. None of them are required to browse the demo.

| Key | Where it lives | Why |
|---|---|---|
| LLM key (Anthropic, OpenAI, xAI, OpenRouter, Concentrate) | Device, expo-secure-store, Settings screen | User key. Never stored in Convex. |
| `FIRECRAWL_API_KEY` | Convex env. Use `unset` until you have a real `fc-...` key | Component requires the var to exist at push. |
| `AGENTMAIL_API_KEY` + `AGENTMAIL_INBOX_ID` | Convex env | Email tool. Skip if unused. |
| `MERGE_API_KEY` + `MERGE_ACCOUNT_TOKEN` | Convex env | Business data. Skip if unused. |
| `RUNWARE_API_KEY` | Convex env | Image generation. Skip if unused. |

```bash
cd packages/backend
npx convex env set FIRECRAWL_API_KEY unset          # required placeholder
npx convex env set FIRECRAWL_API_KEY fc-...         # real key later
npx convex env set AGENTMAIL_API_KEY ...
npx convex env set AGENTMAIL_INBOX_ID ...
npx convex env set MERGE_API_KEY ...
npx convex env set MERGE_ACCOUNT_TOKEN ...
npx convex env set RUNWARE_API_KEY ...
```

Tools hide themselves until configured. Details: [`docs/integrations.md`](docs/integrations.md).

## Convex API the app calls

The Expo app talks to these public functions via `api` from `@expo-demo/backend`. Queries are reactive. There is no polling.

| Module | Public functions |
|---|---|
| `users` | `ensureUser`, `get`, `getByDevice`, `setAppName`, `setRemindersEnabled` |
| `bots` | `create`, `list`, `get`, `update`, `remove`, `setAvatar`, `setReminder`, `clearMemory` |
| `threads` | `list`, `get`, `latestForBot`, `create`, `createGroup`, `addBot`, `rename`, `remove` |
| `messages` | `list`, `send` |
| `agent` | `runAgent` (action: BYOK key rides the request, never written) |
| `search` | `all` |
| `skills` | `listForBot`, `remove` |
| `files` | `generateUploadUrl` |
| `push` | `recordPushToken`, `sendTest` |
| `demo` | `config` |
| `email` | `status` |
| `firecrawl` | `status` |

HTTP (under `/api` on the site URL):

- `POST /api/agentmail/webhook` inbound mail (AgentMail component)
- Firecrawl webhook prefix `/firecrawl/` for durable crawls if a fork adds them

Internal functions (`internal.*`) run the agent loop, demo reset, and reminder sweep. Do not call them from the client.

## Convex components

Installed in [`packages/backend/convex/convex.config.ts`](packages/backend/convex/convex.config.ts):

- [Expo Push Notifications](https://www.convex.dev/components/push-notifications) (`@convex-dev/expo-push-notifications`)
- [AgentMail](https://www.npmjs.com/package/@agentmail/convex) (`@agentmail/convex`)
- [Static Hosting](https://www.convex.dev/components/static-hosting) (`@convex-dev/static-hosting`): two instances, landing at `/` and demo at `/app/`
- [Rate Limiter](https://www.convex.dev/components/rate-limiter) (`@convex-dev/rate-limiter`): idle unless `DEMO_MODE=true`
- [Firecrawl](https://www.convex.dev/components/firecrawl/firecrawl-convex) (`@firecrawl/firecrawl-convex`)

Crons, file storage, search, and streaming writes are core Convex. Check [convex.dev/components](https://www.convex.dev/components) before hand building infra.

The agent loop stays a readable action in `convex/agent.ts` on purpose. When a fork outgrows it: [AI Agent](https://www.convex.dev/components/agent), [Persistent Text Streaming](https://www.convex.dev/components/persistent-text-streaming), [Workflow](https://www.convex.dev/components/workflow), [RAG](https://www.convex.dev/components/rag).

## Deploy the app and the landing page

### GitHub

The template lives at [github.com/waynesutton/expo-convex-agent-app-demo](https://github.com/waynesutton/expo-convex-agent-app-demo). Use it as a template (clean copy) or fork it.

After you publish your copy, point three `REPO_URL` values at your repo:

1. `apps/native/lib/links.ts` (in app About links)
2. `landing/index.html` (GitHub / Fork it buttons)
3. `landing/docs.html` (same)

Full first-push and template-repo steps: [`docs/github.md`](docs/github.md).

### Landing page plus web demo (Convex)

From the repo root, after `npx convex dev` has created your project:

```bash
# Dev deployment smoke test
npm run site:preview

# Production: backend deploy, then both sites
cd packages/backend
npx convex env set FIRECRAWL_API_KEY unset --prod   # once, first prod push
npx convex env set DEMO_MODE true --prod            # only if this is a public demo
cd ../..
npm run site:deploy
```

`site:deploy` runs `npx convex deploy`, uploads `landing/` to the root instance, then builds the Expo web export and uploads it to `demoApp` at `/app/`. Visitors hit `https://<deployment>.convex.site`.

Landing-only after an HTML tweak:

```bash
cd packages/backend
npx static-hosting upload --prod -d ../../landing --no-spa
```

### Native app (stores)

```bash
cd packages/backend && npx convex deploy
cd ../../apps/native
eas build --platform ios
eas build --platform android
eas submit --platform ios
eas submit --platform android
```

Push notifications need a real EAS build, not Expo Go. Walkthrough: [`docs/deploy.md`](docs/deploy.md).

## Fork it and make it yours

1. Use this template or fork, then clone.
2. Run the setup prompt or the manual steps above.
3. Rename: `name`, `slug`, and `scheme` in `apps/native/app.json`, bundle ids, and the three `package.json` names.
4. Set `REPO_URL` in `apps/native/lib/links.ts` and both landing files.
5. Provision your own Convex project (`npx convex dev` creates one on first run).
6. Ship: [`docs/deploy.md`](docs/deploy.md) and [`docs/static-hosting.md`](docs/static-hosting.md).

Nothing phones home. Your Convex project and your GitHub repo are yours.

## Docs

- [Setup](docs/setup.md) and [one prompt setup](docs/one-prompt-setup.md)
- [Agent loop](docs/agent-mode.md)
- [BYOK](docs/byok.md)
- [Auth plan](docs/auth.md) (Convex Auth, not wired)
- [Push](docs/push-notifications.md), [file uploads](docs/file-uploads.md), [workspace tools](docs/integrations.md)
- [Design](docs/design.md), [demo mode](docs/demo-mode.md)
- [Publish to GitHub](docs/github.md)
- [Deploy to stores](docs/deploy.md)
- [Host on Convex](docs/static-hosting.md)

## Repo rules

1. Convex Auth is the only auth path. No Better Auth, no Clerk, no WorkOS.
2. User LLM keys never touch the database or logs.
3. The UI stays reactive. No polling.
4. Check the [components directory](https://www.convex.dev/components) before building infrastructure by hand.

MIT licensed.
