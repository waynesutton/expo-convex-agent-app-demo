# expo-demo

A mobile agent chat template. Expo on the front, Convex on the back, your API keys in your pocket.

Fork it, run the one prompt, and you have a native agent app with realtime chat, group chats with @mentions, importable skills, bot memory, reminders on a cron, full text search over bots and chats, PNG bot avatars in file storage, web scraping via Firecrawl, email via AgentMail, push notifications, and file uploads. Auth is planned (Convex Auth, nothing else) but not wired yet, so you can ship a prototype today and add identity when you need it.

The app opens posed: three seeded demo chats (a chief of staff, a life coach, and a research bot) that a Convex cron resets every 5 minutes. A static landing page in `landing/` sells the template with a copyable setup prompt.

Built for two kinds of people: devs who read the schema first, and vibe coders who paste one prompt into Claude Code, Cursor, or Codex and let the agent do the setup.

## Fork it and make it yours

This repo exists to be copied. Two ways to start:

- **Use this template** on GitHub for a clean history with no upstream baggage. The owner enables this with one setting, covered in [`docs/github.md`](docs/github.md).
- **Fork** if you want to pull upstream changes later.

Then make the copy yours:

1. Clone it and run setup. Paste [`docs/one-prompt-setup.md`](docs/one-prompt-setup.md) into your coding agent, or follow the manual steps below.
2. Rename it. Change `name`, `slug`, and `scheme` in `apps/native/app.json`, the bundle ids under `ios` and `android`, and the package names in the three `package.json` files.
3. Point the app at your repo. Set `REPO_URL` in `apps/native/lib/links.ts`. The in app About screen then links to your README, this fork guide, and your docs folder.
4. Provision your own backend. `npx convex dev` in `packages/backend` creates a fresh Convex project on first run. Add tool keys per the table in "Add your keys."
5. Ship it. [`docs/deploy.md`](docs/deploy.md) walks through EAS Build, EAS Submit, and Convex production.

Nothing in the template phones home. Once `REPO_URL` is yours and Convex is provisioned, the upstream repo has no runtime role.

## The fastest path (agent setup)

Open this repo in your coding agent and paste the contents of [`docs/one-prompt-setup.md`](docs/one-prompt-setup.md). The agent installs dependencies, provisions your Convex backend, sets env vars, and starts the app. Done.

Your agent already knows this repo. `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/` are checked in.

Agents running unattended (no human to click through Convex login) use anonymous agent mode: `CONVEX_AGENT_MODE=anonymous npx convex dev` provisions an isolated local deployment with zero account setup. Details in [`docs/setup.md`](docs/setup.md).

## Manual setup

Requirements: Node 20+, npm 10+, the Expo Go app on your phone (or a simulator).

```bash
git clone <your-fork-url> expo-demo && cd expo-demo
npm install

# Provision the Convex backend (creates a project on first run)
cd packages/backend
npx convex dev
# Leave this running. It prints your deployment URL.
```

In a second terminal:

```bash
cd apps/native
cp .env.example .env.local
# Paste the CONVEX_URL that `npx convex dev` printed:
#   EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
npx expo start
```

Scan the QR code with Expo Go. You should see the thread list. Create a thread, open settings, paste a model API key, and chat.

No phone handy? `npx expo install react-native-web react-dom` then `npx expo start --web` previews the UI in a browser. Key storage falls back to localStorage on web and push is skipped.

Already using EAS? `eas integrations:convex:connect` provisions Convex and writes the env vars for local dev and every EAS environment in one command. See [`docs/setup.md`](docs/setup.md).

## Add your keys

Two kinds of keys, two homes:

| Key | Where it lives | Why |
|---|---|---|
| LLM key (Anthropic, OpenAI, xAI, OpenRouter, Concentrate) | On device, expo-secure-store, entered in the settings screen | It is the user's key. It never touches the database. |
| `FIRECRAWL_API_KEY`, `AGENTMAIL_API_KEY` + `AGENTMAIL_INBOX_ID`, `MERGE_API_KEY` + `MERGE_ACCOUNT_TOKEN`, `RUNWARE_API_KEY` | Convex environment variables (dashboard or `npx convex env set`) | Workspace tools, not user identity. |

[Concentrate](https://concentrate.ai) is an LLM gateway: one key reaches every major model through an OpenAI compatible API, no platform fee. Pick it in settings when you want to switch models without juggling provider keys.

```bash
cd packages/backend
npx convex env set FIRECRAWL_API_KEY fc-...    # scraping and search via firecrawl.dev
npx convex env set AGENTMAIL_API_KEY ...       # email via agentmail.to
npx convex env set AGENTMAIL_INBOX_ID ...      # the inbox email address
npx convex env set MERGE_API_KEY ...           # business data via merge.dev
npx convex env set MERGE_ACCOUNT_TOKEN ...     # from Merge Link
npx convex env set RUNWARE_API_KEY ...         # image generation via runware.ai
```

Email goes through the official [`@agentmail/convex` component](https://www.npmjs.com/package/@agentmail/convex): durable sends with retries, reactive delivery status, and inbound mail landing in Convex tables once you register the webhook (see [`docs/integrations.md`](docs/integrations.md)). Scraping and search go through the official [`@firecrawl/firecrawl-convex` component](https://www.convex.dev/components/firecrawl/firecrawl-convex): typed v2 API calls, retries on transient failures, and durable site crawls when a fork wants them. The settings screen shows whether each is configured, never the keys.

One deploy-time note: the Firecrawl component requires its env var to exist. No key yet? `npx convex env set FIRECRAWL_API_KEY unset` deploys clean and keeps the tools off until a real `fc-...` key replaces it.

The agent works without any of these. Tools report themselves unavailable until their keys exist, and every tool you enable works with all of your bots. Details in [`docs/integrations.md`](docs/integrations.md).

## Bots and @mentions

Bots are named teammates with a job. Put several in one thread and they read each other's replies and coordinate.

Type `@` in the composer to summon one. An autocomplete strip lists your bots, filtered as you type. A message that mentions bots goes only to those bots, in the order you mentioned them, and mentioning a bot that is not in the thread pulls it in first. A message with no mentions goes to every bot in the thread, same as before.

### Group chats

Tap the group icon on the home screen (it appears once you have two bots) to start a group chat. Pick two or more bots, name the group or let it default to their names, and go. Every bot in the group reads the whole conversation, including each other's replies, and responds in turn. Use @name to hand a message to one of them. The workflow that emerges: a lead bot plans, teammates get mentioned for their piece, and the thread reads like a standup.

### Bot settings, delete, and cancel

Every chat header has a gear that opens the bot's settings: avatar, reminder schedule, saved memory, imported skills, and delete. Deleting removes the bot, its chats, its skills, and its avatar file, with a tap again confirmation. The new bot screen has a cancel button, so backing out is one tap.

### Bot avatars

Upload a PNG under 2 MB in bot settings and it replaces the initial-on-color blob everywhere the bot appears: roster, sidebar, chat header, message bubbles, and search results. Files live in [Convex file storage](https://docs.convex.dev/file-storage/upload-files). The client checks type and size before uploading, and `bots.setAvatar` re-validates against the `_storage` system table, deleting rejected or replaced files so storage never leaks. Remove the photo to go back to the initial.

## Search

Tap the magnifying glass next to the settings gear (home header or desktop sidebar) to search everything: bots by name, chats by title, and messages by what's in them. It runs on [Convex full text search](https://docs.convex.dev/search/text-search): three search indexes in the schema, one `search.all` query, results ranked by relevance and prefix matched on the last term so they update as you type. No search service, no sync job, and because it is a normal Convex query the results are reactive like everything else.

## The posed demo

First open seeds three demo bots with scripted chats plus one group thread called Monday planning:

- **Chief of Staff** runs your day and drafts plans. Ships with an hourly check in reminder.
- **Coach** asks hard questions about energy and focus. Ships with a two hour break reminder.
- **Research Bot** compares options and cites sources.

A Convex cron ([`packages/backend/convex/crons.ts`](packages/backend/convex/crons.ts)) rewrites the demo chats back to their script every 5 minutes, so the demo always opens clean. A banner in each demo chat and on the landing page says so. Type into a demo chat and watch it heal on the next sweep. Delete a demo bot and it stays deleted; the reset only touches demo bots that still exist.

### Demo mode for public hosting

Hosting the web demo for strangers? Set `DEMO_MODE=true` on the deployment and the app locks itself down: key entry disappears from Settings (visitors see only which provider is Active, never any key material), banners state that chats are public and reset every 5 minutes, messages are filtered for profanity, links, and length, sends and bot creation are rate limited, and the reset cron also clears idle visitor content. Live replies run on a server side key you set with `DEMO_LLM_API_KEY`. Forks leave `DEMO_MODE` unset and get a normal private install. Full guide: [`docs/demo-mode.md`](docs/demo-mode.md).

## Skills and memory

Paste a link or a block of instructions into any chat and ask the bot to save it as a skill. The `skill_import` tool names it, stores the instructions, and can save it to the current bot or any teammate you name. URLs get read through Firecrawl when the key is set; without it, paste the text directly. Skills extend the bot's persona on every future run, and you can review or remove them in bot settings.

Bots also carry memory. Ask one to remember something and the `remember` tool appends it to a durable note that rides its system prompt. View or clear it in bot settings.

## Reminders on a cron

Each bot can hold one reminder: a message, an interval (30 minutes to daily), and a switch. A 5 minute Convex cron sweeps bots with reminders due and delivers each as a push notification that opens the bot's chat. Settings has a global toggle that silences all reminders without touching per bot schedules. The demo bots ship with reminders on, so the cron has something to do out of the box.

## What's inside

```
expo-demo/
├── apps/native            Expo app (expo-router, TypeScript)
│   ├── app/               Screens: roster, chat, new bot, bot settings, new group, search, settings, about
│   ├── components/        BotAvatar, BotSidebar, MessageBubble, Composer, ToolCallCard, ThinkingDots, DemoBanner
│   └── lib/               theme, convex client, secure key storage, push, links
├── packages/backend       Convex backend
│   └── convex/            schema, threads, messages, agent loop, tools, skills, search, demo, reminders, crons
├── landing/               Static landing page (greyred style, copyable setup prompt)
├── docs/                  Setup, agent mode, BYOK, auth plan, deploy guide
├── AGENTS.md              Instructions for coding agents (source of truth)
└── PRD.md                 What this is and why
```

## Docs

- [Setup](docs/setup.md) and the [one prompt setup](docs/one-prompt-setup.md)
- [Agent mode](docs/agent-mode.md): how the loop, tools, and streaming work
- [BYOK](docs/byok.md): key handling rules
- [Auth plan](docs/auth.md): Convex Auth, not wired yet, and why nothing else is allowed
- [Push notifications](docs/push-notifications.md)
- [File uploads](docs/file-uploads.md)
- [Workspace tools: Firecrawl, AgentMail, Merge, Runware](docs/integrations.md)
- [Design tokens](docs/design.md)
- [Demo mode](docs/demo-mode.md): public hosting posture, moderation, rate limits, server side demo key
- [Publish to GitHub](docs/github.md): init, push, template repo settings
- [Deploy to the App Store](docs/deploy.md): EAS Build, EAS Submit, Convex production
- [Host the site on Convex](docs/static-hosting.md): landing page, web demo, and API on one `.convex.site` URL

In the app itself, Settings has an About screen that links back to this README, the fork guide above, the docs folder, and the Convex and Expo docs. After you publish to GitHub, set `REPO_URL` in `apps/native/lib/links.ts` so those rows point at your repo.

## Landing page and one URL hosting

`landing/` is two static files, no build step, in the greyred style documented in [`docs/design.md`](docs/design.md): the app's gray tokens with one red carrying the brand. `index.html` shows the setup prompt with a copy button, the app screenshots, a QR code that opens the web demo on a phone, the feature list, and the 5 minute demo reset note. `docs.html` is the App docs page: the full fork, setup, and how it works guide written for someone new to Expo and Convex.

The same Convex deployment that runs your backend hosts all of it through the [static hosting component](https://www.convex.dev/components/static-hosting). One URL serves three things: the landing site at `/`, the Expo web demo at `/app/`, and your backend's HTTP routes under `/api`. From the repo root:

```bash
npm run site:preview   # upload both sites to your dev deployment, smoke test first
npm run site:deploy    # deploy the backend to prod, then upload both sites to prod
```

The full guide, including how the two component instances and the Expo base path are wired, is in [`docs/static-hosting.md`](docs/static-hosting.md). GitHub Pages, Netlify, or Vercel still work for the landing folder if you prefer them.

Two constants at the top of each page's script tag wire the links:

- `REPO_URL`: set after you publish your fork. Unhides the GitHub and Fork it links.
- `DEMO_URL`: defaults to `/app/`, where the web demo lives once you host the site on Convex. Point it at a full URL for an external host, or set it to `""` to hide the demo links and the QR code.

## Convex components used

Official components from the [Convex components directory](https://www.convex.dev/components), installed in [`packages/backend/convex/convex.config.ts`](packages/backend/convex/convex.config.ts):

- [Expo Push Notifications](https://www.convex.dev/components/push-notifications) (`@convex-dev/expo-push-notifications`): token registration, delivery, and retries for the reminder and reply notifications.
- [AgentMail](https://www.npmjs.com/package/@agentmail/convex) (`@agentmail/convex`): a stateful email inbox for the bots. Durable sends through a workpool, reactive delivery status, and Svix verified webhook ingest for inbound mail at `/api/agentmail/webhook`.
- [Static Hosting](https://www.convex.dev/components/static-hosting) (`@convex-dev/static-hosting`): serves the landing page at the site root and the Expo web demo at `/app/` from Convex storage, with smart caching and atomic deploys. Two instances, one deployment, one URL. See [`docs/static-hosting.md`](docs/static-hosting.md).
- [Rate Limiter](https://www.convex.dev/components/rate-limiter) (`@convex-dev/rate-limiter`): per visitor send and bot creation limits for the public demo. Idle unless `DEMO_MODE=true`. See [`docs/demo-mode.md`](docs/demo-mode.md).
- [Firecrawl](https://www.convex.dev/components/firecrawl/firecrawl-convex) (`@firecrawl/firecrawl-convex`): typed scrape and web search for the agent tools, with retries and structured errors. Also ready for durable site crawls if your fork needs them. See [`docs/integrations.md`](docs/integrations.md).

Everything else (crons, scheduling, file storage, streaming updates) is core Convex, no extra packages. Before you hand build rate limiting, aggregation, or workflows, check the directory first; there is probably a component for it.

### Why not the AI Agent, Workflow, or RAG components?

Deliberate. This template's job is to teach the shape of an agent app on Convex, so the agent loop, tool calls, and streaming live in one readable action (`convex/agent.ts`) you can step through. The heavier components solve real problems this demo does not have yet, and each maps to a clean upgrade when your fork does:

- [AI Agent](https://www.convex.dev/components/agent) (`@convex-dev/agent`) replaces the hand rolled loop when you want managed message history, per thread vector memory, and usage tracking.
- [Persistent Text Streaming](https://www.convex.dev/components/persistent-text-streaming) replaces the chunked `ctx.db.patch` writes when token by token streaming matters at volume (already on the task list).
- [Workflow](https://www.convex.dev/components/workflow) replaces the single action when tool runs grow into multi step jobs that must survive restarts and retries.
- [RAG](https://www.convex.dev/components/rag) replaces prompt stuffed skills and memory when a bot accumulates more knowledge than fits a system prompt.
- [Batch Worker](https://www.convex.dev/components/batch-worker) or [Workpool](https://www.convex.dev/components/workpool) replace the 5 minute crons if reminder volume ever needs queues instead of sweeps.

BYOK is also a constraint: the Agent component wants a model configured server side, while this template ships user keys that live on the device and ride each request. Swapping to server side keys is the moment to adopt it.

## The rules of this repo

1. Convex Auth is the only auth path. No Better Auth, no Clerk, no WorkOS. PRs adding them get closed.
2. User LLM keys never touch the database or logs.
3. The UI stays reactive. If you find yourself writing polling code, you took a wrong turn.
4. Check the [Convex components directory](https://www.convex.dev/components) before building infrastructure by hand.

## Status

Verified running. The backend deploys clean (schema, indexes, push component, codegen), both workspaces typecheck, and the app boots with the thread list, chat, BYOK guard, and settings all working against a live Convex deployment. Set up was done end to end by a coding agent using anonymous agent mode, which is exactly the story this template exists to tell.

MIT licensed. Build something.
# expo-convex-agent-app-demo
