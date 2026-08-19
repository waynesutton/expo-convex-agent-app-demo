# expo-demo PRD

A mobile agent chat template built on Expo and Convex. Fork it, run one prompt, ship an agent app to the App Store.

Version 0.1.0. Status: template scaffold. Last updated August 2026.

## Why this exists

Every mobile AI app starts the same way. A chat screen, a message list, an agent loop, push notifications, file uploads, and a backend that keeps it all in sync. Developers rebuild this from scratch every time, and vibe coders get stuck wiring the backend before they write a single feature.

expo-demo is the starting line, not the finish line. It gives you a working agent chat app on day one: Convex as the reactive database, Expo as the native shell, and a one prompt setup so any coding agent (Claude Code, Cursor, Codex) can stand it up without human babysitting.

The Expo team published "Convex is a backend for Expo apps" and asked how the two can get closer. This template is one answer. It uses `eas integrations:convex:connect` where possible and Convex components for the mobile plumbing.

## Who it's for

Two people, one template.

The experienced dev: ships React Native for a living, wants typed end to end code, hates magic, reads the schema first. They get a clean monorepo, real Convex functions, and no vendor auth lock.

The vibe coder: has an idea and a coding agent. They get AGENTS.md, a one prompt setup, and docs written so the agent does the work.

## What it is

A monorepo with two workspaces:

- `apps/native`: Expo app (SDK 53+, expo-router, TypeScript). Thread list, chat screen, settings screen for API keys.
- `packages/backend`: Convex backend. Schema, chat functions, the agent loop, push notifications, file storage, and tool integrations.

Core features in v0.1:

1. **Agent chat.** Threads and messages stored in Convex. The UI is reactive, so streaming text and tool calls appear live with no polling code.
2. **BYOK.** Users bring their own model API key (Anthropic, OpenAI, xAI, or OpenRouter). Keys live in expo-secure-store on the device and travel per request. They are never written to the database. This is a hard rule.
3. **Agent tools.** The agent can scrape and search the web with Firecrawl and send or read email with AgentMail. Tool keys are workspace level, set as Convex environment variables, not per user.
4. **Push notifications.** The `@convex-dev/expo-push-notifications` component notifies users when an agent run finishes while the app is backgrounded.
5. **File uploads.** Convex file storage with upload URLs. Attach images to messages. Vision capable models can read them.
6. **One prompt setup.** `docs/one-prompt-setup.md` contains a single prompt that walks any coding agent through install, Convex provisioning, env setup, and first run.

## What it is not (yet)

- **Auth.** Convex Auth is the chosen path and the schema is shaped for it, but it is not wired. See `docs/auth.md` for the migration plan. Better Auth, Clerk, and WorkOS are out. Not later, not optionally. Convex Auth only.
- **Offline sync.** Convex handles reconnects and optimistic updates. Full local first sync is out of scope for v0.1.
- **Payments.** No RevenueCat, no paywalls. Keep the template focused.
- **Web app.** Mobile first. Expo web works for previewing, but there is no separate Next.js app.

## Design direction

A messaging app for AI teammates: light, quiet, and legible. Not another gradient SaaS look.

Tokens (see `apps/native/lib/theme.ts` and `docs/design.md`):

- Paper white ground `#FFFFFF`, mist `#F4F4F2` for raised surfaces, field `#EDEDEA` for inputs
- Ink `#141412` for primary text, the user's bubble, and primary actions
- Slate `#6D6D66` for secondary text, faint `#A3A39B` for metadata
- Signal red `#C03D2E` for errors only
- Bot identity colors from `BOT_COLORS`, one per bot, used for avatars and attribution
- Type: system sans for UI, monospace for the wordmark, tool calls, timestamps, and anything machine generated. Weights cap at 600; no display sizes.

The signature element: tool calls render as bordered mono cards, like a terminal transcript inside the chat. The agent shows its work.

## Architecture decisions

**Convex is the database and the runtime.** Queries power the UI reactively. The agent loop runs in a Convex action, writes partial output through internal mutations, and the client re-renders as chunks land. No websocket code in the app, ever.

**BYOK stays on device.** LLM keys go secure-store to action to provider, then get dropped. Firecrawl and AgentMail keys are server env vars because they are workspace resources, not user identity.

**Components over custom code.** Push uses the official Convex component (batching, retries, receipt tracking come free). The upgrade path for streaming is the Persistent Text Streaming component. The upgrade path for the agent loop is the Convex Agent component once BYOK per request fits its model.

**Users are device scoped until auth lands.** A `deviceId` (generated once, stored in secure store) keys the users table. When Convex Auth arrives, deviceId rows migrate to authenticated identities. The schema keeps `userId` on every table so the migration is a data move, not a rewrite.

## Success criteria

- A coding agent can go from fork to running app using only AGENTS.md and the one prompt. Zero human edits.
- An experienced dev can read schema.ts and agent.ts and understand the whole system in under ten minutes.
- `eas build` and `eas submit` work from the included deploy guide without extra config archaeology.
- No auth provider SDKs appear anywhere in the dependency tree.

## Open questions

- Streaming granularity: chunked mutation writes are simple but chatty. Move to Persistent Text Streaming when message volume justifies it.
- Should Firecrawl and AgentMail also support BYOK per user? V0.1 says no. Revisit if multi tenant use shows up.
- Expo SDK pinning: the template targets the current SDK at fork time. The one prompt tells the agent to check and upgrade.

## Roadmap after v0.1

1. Wire Convex Auth (sign in with Apple first, it is an App Store requirement for social login apps)
2. Persistent Text Streaming component for token level streaming
3. Voice input via expo-audio
4. EAS Workflows CI: convex deploy and eas update in lockstep
5. Agent memory: RAG component over past threads
