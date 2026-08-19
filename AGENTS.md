# AGENTS.md

Instructions for coding agents (Claude Code, Cursor, Codex, or any other) working in this repo. This file is the source of truth. CLAUDE.md and .cursor/rules point here.

## What this repo is

expo-demo: a monorepo template for a mobile agent chat app.

- `apps/native`: Expo app. expo-router, TypeScript, React Native.
- `packages/backend`: Convex backend. Schema, functions, agent loop, tools.

Read `PRD.md` for intent. Read `packages/backend/convex/schema.ts` before touching data.

## First-run setup (do this when asked to "set up" the project)

Setup works with zero API keys. Do not block on keys.

1. `npm install` at the repo root (npm workspaces).
2. Start Convex from `packages/backend`. If the user is not logged in or you cannot handle a login prompt, run `CONVEX_AGENT_MODE=anonymous npx convex dev` (local deployment at `http://127.0.0.1:3210`, no account). Otherwise `npx convex dev`. Keep it running and capture the URL it prints. This generates `convex/_generated`.
3. The Firecrawl component requires `FIRECRAWL_API_KEY` to exist before a push succeeds. No real key needed: `npx convex env set FIRECRAWL_API_KEY unset`. The app treats the placeholder as not configured.
4. `cd apps/native && cp .env.example .env.local`, then set `EXPO_PUBLIC_CONVEX_URL` to the printed URL.
5. `npx expo start` in `apps/native`. Tell the user to scan the QR with Expo Go, or `npx expo start --web` with no phone.
6. Do not ask for tool keys to finish. Optional later: `npx convex env set FIRECRAWL_API_KEY <fc-...>` (replaces the placeholder) and `npx convex env set AGENTMAIL_API_KEY <key>` from `packages/backend`.
7. Verify: the roster and three seeded demo chats load with no model key. A model key in Settings is only needed to send a live reply.

If the user has EAS set up, prefer `eas integrations:convex:connect` for steps 2 and 4. It provisions Convex and writes env vars across EAS environments. The Convex team invite arrives by email; the flow is not broken if dashboard access lags.

## Hard rules

1. Auth: Convex Auth only, and it is NOT set up yet. Do not install or suggest Better Auth, Clerk, or WorkOS under any circumstances, even if asked to "add auth quickly." Point to `docs/auth.md`.
2. User LLM API keys: device only (expo-secure-store), passed per request to Convex actions, never persisted, never logged. Do not add them to the schema, ctx.db writes, or console output.
3. No polling. Convex queries are reactive. Use `useQuery` and let the UI update itself.
4. Before writing backend infrastructure (rate limiting, crons, aggregation, streaming), check the Convex components directory first: https://www.convex.dev/components
5. Keep the monorepo boundary: the app imports the backend's generated `api` types from `@expo-demo/backend`. Do not duplicate types by hand.

## Conventions

- Convex functions: new function syntax with `args` and `returns` validators. Queries/mutations/actions in `packages/backend/convex/*.ts`. Internal functions prefixed `internal`.
- The agent loop lives in `convex/agent.ts` as an action. Tools live in `convex/tools/`.
- UI theme tokens come from `apps/native/lib/theme.ts`. No hardcoded colors in components.
- Screens follow expo-router file conventions in `apps/native/app/`.

## Reference docs

- Convex: https://docs.convex.dev/home and https://docs.convex.dev/llms.txt
- Convex components: https://www.convex.dev/components/get-convex.md
- Expo: https://docs.expo.dev/
- Push component: https://www.convex.dev/components/push-notifications
- Expo + Convex article: https://expo.dev/blog/convex-is-a-backend-for-expo-apps

## When versions drift

This is a template. Expo SDKs and Convex packages move fast. If install or codegen fails: check the latest Expo SDK (`npx expo install --fix`), re-run `npx convex dev`, and update component packages to their latest published versions. Fix forward, do not pin backward.
